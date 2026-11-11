const db = require("../../config/db");
const { WhatsAppProvider, isCloudConfigured } = require("./WhatsAppProvider");

const e164 = /^\+[1-9]\d{7,14}$/;
const STALE_PENDING_AFTER = "5 minutes";
const RECIPIENT_LIMIT_LOCK = 781513206;
const RETRY_DELAYS_MS = [1000, 4000, 15000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

function configuredRecipientLimits(env = process.env) {
  const readLimit = (key, fallback) => {
    const value = Number(env[key] || fallback);
    if (!Number.isInteger(value) || value < 1) throw new Error(`${key} deve ser um inteiro positivo.`);
    return value;
  };
  return {
    activeMax: readLimit("MAX_RECIPIENTS_ACTIVE", 5),
    totalMax: readLimit("MAX_RECIPIENTS_TOTAL", 10),
  };
}

async function recipientUsage(connection = db) {
  const defaultPhone = process.env.WHATSAPP_DEFAULT_RECIPIENT?.trim();
  const validDefault = defaultPhone && e164.test(defaultPhone) ? defaultPhone : null;
  const { rows } = await connection.query(
    `SELECT count(*)::int AS total,
       count(*) FILTER (WHERE ativo = true)::int AS active,
       count(*) FILTER (WHERE telefone = $1)::int AS default_total,
       count(*) FILTER (WHERE telefone = $1 AND ativo = true)::int AS default_active
     FROM whatsapp_destinatario`,
    [validDefault],
  );
  const row = rows[0];
  return {
    totalCount: row.total + (validDefault && row.default_total === 0 ? 1 : 0),
    activeCount: row.active + (validDefault && row.default_active === 0 ? 1 : 0),
  };
}

async function getRecipientCapacity() {
  const [limits, usage] = await Promise.all([Promise.resolve(configuredRecipientLimits()), recipientUsage()]);
  return { ...usage, ...limits };
}

async function listRecipients() {
  const { rows } = await db.query(
    "SELECT id_destinatario, nome, telefone, ativo, criado_em FROM whatsapp_destinatario WHERE ativo = true ORDER BY nome",
  );
  const recipients = rows.map((row) => ({ ...row, origem: "aplicacao" }));
  const defaultPhone = process.env.WHATSAPP_DEFAULT_RECIPIENT?.trim();
  if (defaultPhone && e164.test(defaultPhone) && !recipients.some((item) => item.telefone === defaultPhone)) {
    recipients.unshift({
      id_destinatario: null,
      nome: "Destino padrão (.env)",
      telefone: defaultPhone,
      ativo: true,
      origem: "env",
    });
  }
  return recipients;
}

async function createRecipient({ name, phone }) {
  const connection = await db.getClient();
  try {
    await connection.query("BEGIN");
    await connection.query("SELECT pg_advisory_xact_lock($1)", [RECIPIENT_LIMIT_LOCK]);
    const capacity = { ...await recipientUsage(connection), ...configuredRecipientLimits() };
    if (capacity.activeCount >= capacity.activeMax) {
      const error = new Error(`Limite de ${capacity.activeMax} destinatários ativos atingido.`);
      error.status = 422;
      throw error;
    }
    if (capacity.totalCount >= capacity.totalMax) {
      const error = new Error(`Limite de ${capacity.totalMax} destinatários cadastrados atingido; remova registros inativos para liberar espaço.`);
      error.status = 422;
      throw error;
    }
    const { rows } = await connection.query(
      "INSERT INTO whatsapp_destinatario (nome, telefone) VALUES ($1, $2) RETURNING id_destinatario, nome, telefone, ativo, criado_em",
      [name, phone],
    );
    await connection.query("COMMIT");
    return { ...rows[0], origem: "aplicacao" };
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}

async function deactivateRecipient(recipientId) {
  const { rowCount } = await db.query(
    "UPDATE whatsapp_destinatario SET ativo = false, atualizado_em = now() WHERE id_destinatario = $1 AND ativo = true",
    [recipientId],
  );
  return rowCount > 0;
}

async function markStalePendingUnknown(reportId) {
  const values = [STALE_PENDING_AFTER];
  const reportFilter = reportId ? "AND id_relatorio = $2" : "";
  if (reportId) values.push(reportId);
  await db.query(
    `UPDATE relatorio_envio
     SET status = 'unknown', erro = 'O processo foi interrompido antes da confirmação do provedor.'
     WHERE status = 'pending' AND criado_em < now() - $1::interval ${reportFilter}`,
    values,
  );
}

async function existingDelivery(reportId, phone) {
  const { rows } = await db.query(
    "SELECT * FROM relatorio_envio WHERE id_relatorio = $1 AND destinatario = $2",
    [reportId, phone],
  );
  return rows[0] || null;
}

async function reserveDelivery(report, recipient, { confirmResend, providerFactory }) {
  const mode = isCloudConfigured(process.env) ? "cloud" : "mock";
  const { rows: inserted } = await db.query(
    `INSERT INTO relatorio_envio (id_relatorio, destinatario, modo, status)
     VALUES ($1, $2, $3, 'pending')
     ON CONFLICT (id_relatorio, destinatario) DO NOTHING
     RETURNING *`,
    [report.id_relatorio, recipient.telefone, mode],
  );

  let reservation = inserted[0];
  if (!reservation) {
    const prior = await existingDelivery(report.id_relatorio, recipient.telefone);
    if (!prior || prior.status === "pending") return prior;
    if (!confirmResend) return prior;

    const { rows: reset } = await db.query(
      `UPDATE relatorio_envio
       SET status = 'pending', modo = $1, tentativas = 0, id_mensagem = NULL,
           erro = NULL, criado_em = now(), enviado_em = NULL
       WHERE id_envio = $2 AND status = $3
       RETURNING *`,
      [mode, prior.id_envio, prior.status],
    );
    reservation = reset[0];
    if (!reservation) return existingDelivery(report.id_relatorio, recipient.telefone);
  }

  const provider = providerFactory ? providerFactory() : new WhatsAppProvider();
  let attempts = 0;
  let result;
  let lastError;

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    try {
      result = await provider.sendReport(recipient.telefone, report, { deliveryId: reservation.id_envio });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (!error.retryable || attempts >= MAX_ATTEMPTS) break;
      await new Promise((resolve) => setTimeout(resolve, error.retryAfterMs ?? RETRY_DELAYS_MS[attempts - 1]));
    }
  }

  const { rows } = await db.query(
    `UPDATE relatorio_envio SET status = $1, modo = $2, tentativas = $3,
       id_mensagem = $4, erro = $5, enviado_em = CASE WHEN $1::varchar = 'sent' THEN now() ELSE NULL END
     WHERE id_envio = $6 RETURNING *`,
    [lastError ? "failed" : "sent", result?.mode || mode, attempts, result?.messageId || null, lastError?.message || null, reservation.id_envio],
  );
  return rows[0];
}

async function sendReport(report, { skipSent = false, confirmResend = false, providerFactory } = {}) {
  const recipients = await listRecipients();
  if (!recipients.length) {
    const error = new Error("Cadastre ao menos um destinatário de WhatsApp para enviar o relatório.");
    error.status = 422;
    throw error;
  }
  await markStalePendingUnknown(report.id_relatorio);

  const previous = await Promise.all(recipients.map((recipient) => existingDelivery(report.id_relatorio, recipient.telefone)));
  const needsConfirmation = previous.filter((delivery) => delivery && ["sent", "failed", "unknown"].includes(delivery.status));
  if (!skipSent && needsConfirmation.length && !confirmResend) {
    return {
      confirmationRequired: true,
      message: "Já existe envio para um ou mais destinatários. Confirme para tentar novamente.",
      destinatarios: needsConfirmation.map((delivery) => ({ telefone: delivery.destinatario, status: delivery.status })),
    };
  }

  const results = [];
  for (const recipient of recipients) {
    const prior = await existingDelivery(report.id_relatorio, recipient.telefone);
    if (skipSent && prior) continue;
    results.push(await reserveDelivery(report, recipient, { confirmResend, providerFactory }));
  }
  return { mode: isCloudConfigured(process.env) ? "cloud" : "mock", results: results.filter(Boolean) };
}

async function listDeliveries(reportId) {
  await markStalePendingUnknown(reportId);
  const { rows } = await db.query(
    "SELECT id_envio, destinatario, status, modo, tentativas, id_mensagem, erro, criado_em, enviado_em FROM relatorio_envio WHERE id_relatorio = $1 ORDER BY criado_em DESC",
    [reportId],
  );
  return rows;
}

module.exports = {
  e164,
  listRecipients,
  getRecipientCapacity,
  createRecipient,
  deactivateRecipient,
  sendReport,
  listDeliveries,
};
