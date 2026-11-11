const db = require("../../config/db");
const { WhatsAppProvider, isCloudConfigured } = require("./WhatsAppProvider");

const e164 = /^\+[1-9]\d{7,14}$/;

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
  const { rows } = await db.query(
    "INSERT INTO whatsapp_destinatario (nome, telefone) VALUES ($1, $2) RETURNING id_destinatario, nome, telefone, ativo, criado_em",
    [name, phone],
  );
  return { ...rows[0], origem: "aplicacao" };
}

async function deactivateRecipient(recipientId) {
  const { rowCount } = await db.query(
    "UPDATE whatsapp_destinatario SET ativo = false, atualizado_em = now() WHERE id_destinatario = $1 AND ativo = true",
    [recipientId],
  );
  return rowCount > 0;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sendToRecipient(report, recipient) {
  const provider = new WhatsAppProvider();
  const mode = isCloudConfigured(process.env) ? "cloud" : "mock";
  const { rows: created } = await db.query(
    "INSERT INTO relatorio_envio (id_relatorio, destinatario, modo, status) VALUES ($1, $2, $3, 'pending') RETURNING id_envio",
    [report.id_relatorio, recipient.telefone, mode],
  );
  const idEnvio = created[0].id_envio;
  let attempts = 0;
  let result;
  let lastError;

  while (attempts < 2) {
    attempts += 1;
    try {
      result = await provider.sendReport(recipient.telefone, report);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (!error.retryable || attempts >= 2) break;
      await wait(500);
    }
  }

  const { rows } = await db.query(
    `UPDATE relatorio_envio SET status = $1, modo = $2, tentativas = $3,
       id_mensagem = $4, erro = $5, enviado_em = CASE WHEN $1::varchar = 'sent' THEN now() ELSE NULL END
     WHERE id_envio = $6 RETURNING *`,
    [lastError ? "failed" : "sent", result?.mode || mode, attempts, result?.messageId || null, lastError?.message || null, idEnvio],
  );
  return rows[0];
}

async function sendReport(report, { skipSent = false } = {}) {
  const recipients = await listRecipients();
  if (!recipients.length) {
    const error = new Error("Cadastre ao menos um destinatário de WhatsApp para enviar o relatório.");
    error.status = 422;
    throw error;
  }
  const results = [];
  for (const recipient of recipients) {
    if (skipSent) {
      const { rows } = await db.query(
        "SELECT 1 FROM relatorio_envio WHERE id_relatorio = $1 AND destinatario = $2 AND status = 'sent' LIMIT 1",
        [report.id_relatorio, recipient.telefone],
      );
      if (rows.length) continue;
    }
    results.push(await sendToRecipient(report, recipient));
  }
  return { mode: isCloudConfigured(process.env) ? "cloud" : "mock", results };
}

async function listDeliveries(reportId) {
  const { rows } = await db.query(
    "SELECT id_envio, destinatario, status, modo, tentativas, id_mensagem, erro, criado_em, enviado_em FROM relatorio_envio WHERE id_relatorio = $1 ORDER BY criado_em DESC",
    [reportId],
  );
  return rows;
}

module.exports = {
  e164,
  listRecipients,
  createRecipient,
  deactivateRecipient,
  sendReport,
  listDeliveries,
};
