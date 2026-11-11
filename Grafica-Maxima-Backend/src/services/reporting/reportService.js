const db = require("../../config/db");
const { getPeriod } = require("./period");

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function amount(value) {
  return Number(value || 0);
}

function rate(numerator, denominator) {
  return denominator ? (numerator / denominator) * 100 : 0;
}

function compare(current, previous) {
  const difference = Number((current - previous).toFixed(2));
  return {
    difference,
    percent: previous ? Number(((difference / previous) * 100).toFixed(1)) : null,
  };
}

function dateLabel(date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

function summarize(period, metrics, changes) {
  const periodLabel = period.type === "weekly" ? "Semana" : "Mês";
  const revenueChange = changes.revenue.percent;
  const revenueComparison = revenueChange == null
    ? "sem base no período anterior"
    : `${revenueChange >= 0 ? "+" : ""}${decimal.format(revenueChange)}% vs. período anterior`;
  const production = metrics.approvedProduction.count
    ? `${metrics.approvedProduction.count} aprovado(s)/em produção`
    : "nenhum orçamento aprovado/em produção";
  return `${periodLabel} de ${dateLabel(period.start)} a ${dateLabel(period.end)}: ${metrics.quotesCreated} orçamento(s) criado(s), ${metrics.finalizedSales} venda(s) finalizada(s) e receita de ${currency.format(metrics.revenue)} (${revenueComparison}). Conversão de ${decimal.format(metrics.conversionRate)}%; ${production}.`;
}

async function collectMetrics(connection, startUtc, nextStartUtc) {
  const { rows: quoteRows } = await connection.query(
    `SELECT
       COUNT(*)::int AS quotes_created,
       COUNT(*) FILTER (WHERE status IN ('Aprovado', 'Finalizado'))::int AS converted_quotes,
       COUNT(*) FILTER (WHERE status = 'Aprovado')::int AS approved_count,
       COALESCE(SUM(valor_total) FILTER (WHERE status = 'Aprovado'), 0)::numeric AS approved_value
     FROM orcamento
     WHERE data_criacao >= $1 AND data_criacao < $2`,
    [startUtc, nextStartUtc],
  );
  const { rows: salesRows } = await connection.query(
    `SELECT COUNT(*)::int AS finalized_sales,
       COALESCE(SUM(valor_total), 0)::numeric AS revenue
     FROM orcamento
     WHERE status = 'Finalizado' AND data_finalizacao >= $1 AND data_finalizacao < $2`,
    [startUtc, nextStartUtc],
  );
  const { rows: productRows } = await connection.query(
    `SELECT COALESCE(i.tipo_produto, 'Produto sem descrição') AS product,
       SUM(i.quantidade)::int AS quantity,
       COALESCE(SUM(i.valor_total), 0)::numeric AS value
     FROM orcamento o
     JOIN item i ON i.id_orcamento = o.id_orcamento
     WHERE o.status = 'Finalizado' AND o.data_finalizacao >= $1 AND o.data_finalizacao < $2
     GROUP BY COALESCE(i.tipo_produto, 'Produto sem descrição')
     ORDER BY SUM(i.valor_total) DESC, product ASC
     LIMIT 5`,
    [startUtc, nextStartUtc],
  );
  const quotes = quoteRows[0];
  const sales = salesRows[0];
  const quotesCreated = Number(quotes.quotes_created);
  const finalizedSales = Number(sales.finalized_sales);
  const revenue = amount(sales.revenue);
  return {
    quotesCreated,
    conversionRate: Number(rate(Number(quotes.converted_quotes), quotesCreated).toFixed(1)),
    finalizedSales,
    revenue,
    approvedProduction: {
      count: Number(quotes.approved_count),
      value: amount(quotes.approved_value),
    },
    averageTicket: finalizedSales ? Number((revenue / finalizedSales).toFixed(2)) : 0,
    topProducts: productRows.map((row) => ({
      product: row.product,
      quantity: Number(row.quantity || 0),
      value: amount(row.value),
    })),
  };
}

async function calculateReport(type, date, generatedBy = null) {
  const period = getPeriod(type, date);
  const connection = await db.getClient();
  let current;
  let previous;
  try {
    await connection.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    [current, previous] = await Promise.all([
      collectMetrics(connection, period.startUtc, period.nextStartUtc),
      collectMetrics(connection, period.previousStartUtc, period.startUtc),
    ]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const changes = {
    quotesCreated: compare(current.quotesCreated, previous.quotesCreated),
    conversionRate: {
      percentagePoints: Number((current.conversionRate - previous.conversionRate).toFixed(1)),
    },
    finalizedSales: compare(current.finalizedSales, previous.finalizedSales),
    revenue: compare(current.revenue, previous.revenue),
    approvedProduction: {
      count: compare(current.approvedProduction.count, previous.approvedProduction.count),
      value: compare(current.approvedProduction.value, previous.approvedProduction.value),
    },
    averageTicket: compare(current.averageTicket, previous.averageTicket),
  };
  const data = { timezone: period.timezone, metrics: current, previous, changes };
  const summary = summarize(period, current, changes);
  const { rows } = await db.query(
    `INSERT INTO relatorio (tipo, data_inicio, data_fim, dados, resumo, gerado_por, gerado_em, atualizado_em)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, now(), now())
     ON CONFLICT (tipo, data_inicio, data_fim)
     DO UPDATE SET dados = EXCLUDED.dados, resumo = EXCLUDED.resumo,
       gerado_por = COALESCE(EXCLUDED.gerado_por, relatorio.gerado_por),
       gerado_em = now(), atualizado_em = now()
     RETURNING *`,
    [type, period.start, period.end, JSON.stringify(data), summary, generatedBy],
  );
  return rows[0];
}

async function getReport(type, date, generatedBy = null) {
  const period = getPeriod(type, date);
  const { rows } = await db.query(
    "SELECT * FROM relatorio WHERE tipo = $1 AND data_inicio = $2 AND data_fim = $3",
    [period.type, period.start, period.end],
  );
  return rows[0] || calculateReport(type, date, generatedBy);
}

async function listReports({ type, limit = 12 } = {}) {
  const values = [];
  let where = "";
  if (type) {
    where = "WHERE tipo = $1";
    values.push(type);
  }
  values.push(limit);
  const { rows } = await db.query(
    `SELECT id_relatorio, tipo, data_inicio, data_fim, dados, resumo, gerado_em
     FROM relatorio ${where}
     ORDER BY data_inicio DESC, gerado_em DESC
     LIMIT $${values.length}`,
    values,
  );
  return rows;
}

async function getReportById(reportId) {
  const { rows } = await db.query("SELECT * FROM relatorio WHERE id_relatorio = $1", [reportId]);
  return rows[0] || null;
}

module.exports = { calculateReport, getReport, listReports, getReportById };
