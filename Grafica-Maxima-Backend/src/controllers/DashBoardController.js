const db = require("../config/db");
const { HttpError } = require("../utils/validation");
const ZONA = "America/Sao_Paulo";

function mesLocal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA, year: "numeric", month: "2-digit",
  }).format(new Date());
}

function mesAnterior(mes) {
  const [ano, numero] = mes.split("-").map(Number);
  return `${numero === 1 ? ano - 1 : ano}-${String(numero === 1 ? 12 : numero - 1).padStart(2, "0")}`;
}

async function resumoPeriodo(mes) {
  const inicio = `${mes}-01`;
  const { rows: [criados] } = await db.query(
    `SELECT count(*)::int AS novos,
      coalesce(sum(valor_total), 0)::float8 AS "valorNovos",
      count(*) FILTER (WHERE status IN ('Aprovado', 'Finalizado'))::int AS aprovados,
      coalesce(sum(valor_total) FILTER (WHERE status IN ('Aprovado', 'Finalizado')), 0)::float8 AS "valorAprovados",
      count(*) FILTER (WHERE status NOT IN ('Inativo', 'Finalizado'))::int AS "abertosCriados",
      coalesce(sum(valor_total) FILTER (WHERE status NOT IN ('Inativo', 'Finalizado')), 0)::float8 AS "valorAbertosCriados"
     FROM orcamento
     WHERE data_criacao >= ($1::date AT TIME ZONE '${ZONA}')
       AND data_criacao < (($1::date + interval '1 month') AT TIME ZONE '${ZONA}')`,
    [inicio],
  );
  const { rows: [fechados] } = await db.query(
    `SELECT count(*)::int AS finalizados,
      coalesce(sum(valor_total), 0)::float8 AS "valorFinalizados"
     FROM orcamento
     WHERE status = 'Finalizado'
       AND data_finalizacao >= ($1::date AT TIME ZONE '${ZONA}')
       AND data_finalizacao < (($1::date + interval '1 month') AT TIME ZONE '${ZONA}')`,
    [inicio],
  );
  return { ...criados, ...fechados };
}

module.exports = async (req, res) => {
  const mes = req.query.mes || mesLocal();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes))
    throw new HttpError(422, "Mês inválido.");
  const start = `${mes}-01`;
  const { rows } = await db.query(
    `SELECT id_orcamento, to_char(data_criacao AT TIME ZONE '${ZONA}', 'DD') AS dia_local, status, valor_total FROM orcamento WHERE data_criacao >= ($1::date AT TIME ZONE '${ZONA}') AND data_criacao < (($1::date + interval '1 month') AT TIME ZONE '${ZONA}') ORDER BY data_criacao`,
    [start],
  );
  const { rows: activeRows } = await db.query(
    `SELECT id_orcamento, status, valor_total FROM orcamento WHERE status NOT IN ('Inativo', 'Finalizado')`,
  );

  const semanas = Array.from({ length: 5 }, (_, i) => ({
    semana: i + 1,
    novos: 0,
    aprovados: 0,
    ativos: 0,
    valor: 0,
    valorAprovado: 0,
  }));
  let valorAtivo = 0;
  let ativos = 0;
  let aprovados = 0;
  let valorNovos = 0;
  let valorAprovados = 0;
  const statusCounts = {};

  // Calculate period metrics
  for (const row of rows) {
    const semana =
      semanas[
        Math.min(
          4,
          Math.floor((Number(row.dia_local) - 1) / 7),
        )
      ];
    semana.novos++;
    semana.valor += Number(row.valor_total);
    valorNovos += Number(row.valor_total);
    if (["Aprovado", "Finalizado"].includes(row.status)) {
      aprovados++;
      semana.aprovados++;
      semana.valorAprovado += Number(row.valor_total);
      valorAprovados += Number(row.valor_total);
    }
    if (!["Inativo", "Finalizado"].includes(row.status))
      semana.ativos += Number(row.valor_total);
  }

  // Calculate active pipeline metrics
  // Include period rows in statusCounts so we still see 'Finalizado' for the period
  const pipelineRows = [...activeRows];
  for (const row of rows) {
    if (row.status === "Finalizado" || row.status === "Inativo") {
      pipelineRows.push(row);
    }
  }

  // Remove duplicates just in case
  const uniquePipelineRows = pipelineRows.filter(
    (v, i, a) => a.findIndex((t) => t.id_orcamento === v.id_orcamento) === i,
  );

  for (const row of uniquePipelineRows) {
    if (!["Inativo", "Finalizado"].includes(row.status)) {
      ativos++;
      valorAtivo += Number(row.valor_total);
    }

    const s = row.status || "Sem status";
    if (!statusCounts[s]) statusCounts[s] = { count: 0, valor: 0 };
    statusCounts[s].count++;
    statusCounts[s].valor += Number(row.valor_total);
  }

  const { rows: recentes } = await db.query(
    "SELECT o.*,c.nome AS nome_cliente FROM orcamento o LEFT JOIN cliente c ON c.id_cliente=o.id_cliente ORDER BY o.id_orcamento DESC LIMIT 4",
  );

  const { rows: orcamentosPeriodo } = await db.query(
    `SELECT o.*, c.nome AS nome_cliente 
     FROM orcamento o 
     LEFT JOIN cliente c ON c.id_cliente=o.id_cliente 
     WHERE o.data_criacao >= ($1::date AT TIME ZONE '${ZONA}') AND o.data_criacao < (($1::date + interval '1 month') AT TIME ZONE '${ZONA}')
     ORDER BY o.id_orcamento DESC 
     LIMIT 50`,
    [start],
  );

  const [totais, anterior] = await Promise.all([
    resumoPeriodo(mes), resumoPeriodo(mesAnterior(mes)),
  ]);
  const { rows: precisamAtencao } = await db.query(
    `SELECT o.id_orcamento, o.status, o.valor_total, o.data_criacao, o.data_validade,
            c.nome AS nome_cliente,
            CASE WHEN o.data_validade IS NOT NULL AND
              (o.data_validade AT TIME ZONE '${ZONA}')::date <= (now() AT TIME ZONE '${ZONA}')::date + 3
              THEN 'validade' ELSE 'negociacao' END AS motivo
     FROM orcamento o LEFT JOIN cliente c ON c.id_cliente = o.id_cliente
     WHERE o.status NOT IN ('Inativo', 'Finalizado')
       AND ((o.data_validade IS NOT NULL AND
         (o.data_validade AT TIME ZONE '${ZONA}')::date <= (now() AT TIME ZONE '${ZONA}')::date + 3)
         OR (o.status = 'Em negociação' AND
           o.data_criacao < now() - interval '7 days'))
     ORDER BY o.data_validade NULLS LAST, o.data_criacao LIMIT 6`,
  );

  res.json({
    mes,
    ativos,
    valorAtivo,
    novos: rows.length,
    valorNovos,
    aprovados,
    valorAprovados,
    semanas,
    recentes,
    statusCounts,
    orcamentosPeriodo,
    totais,
    anterior,
    precisamAtencao,
  });
};
