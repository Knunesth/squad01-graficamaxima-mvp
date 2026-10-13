const db = require('../config/db');
const { HttpError } = require('../utils/validation');
module.exports = async (req, res) => {
  const mes = req.query.mes || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new HttpError(422, 'Mês inválido.');
  const start = `${mes}-01`;
  const [rows] = await db.query(`SELECT id_orcamento, data_criacao, status, valor_total FROM orcamento WHERE data_criacao >= ? AND data_criacao < DATE_ADD(?, INTERVAL 1 MONTH) ORDER BY data_criacao`, [start, start]);
  const [activeRows] = await db.query(`SELECT id_orcamento, status, valor_total FROM orcamento WHERE status NOT IN ('Inativo', 'Finalizado')`);
  
  const semanas = Array.from({ length: 5 }, (_, i) => ({ semana: i + 1, novos: 0, aprovados: 0, ativos: 0 }));
  let valorAtivo = 0; let ativos = 0; let aprovados = 0;
  const statusCounts = {};
  
  // Calculate period metrics
  for (const row of rows) {
    const semana = semanas[Math.min(4, Math.floor((Number(String(row.data_criacao).slice(8,10)) - 1) / 7))];
    semana.novos++;
    if (['Aprovado','Finalizado'].includes(row.status)) { aprovados++; semana.aprovados++; }
  }

  // Calculate active pipeline metrics
  // Include period rows in statusCounts so we still see 'Finalizado' for the period
  const pipelineRows = [...activeRows];
  for (const row of rows) {
    if (row.status === 'Finalizado' || row.status === 'Inativo') {
      pipelineRows.push(row);
    }
  }

  // Remove duplicates just in case
  const uniquePipelineRows = pipelineRows.filter((v, i, a) => a.findIndex(t => (t.id_orcamento === v.id_orcamento)) === i);

  for (const row of uniquePipelineRows) {
    if (!['Inativo','Finalizado'].includes(row.status)) { 
      ativos++; 
      valorAtivo += Number(row.valor_total); 
    }
    
    const s = row.status || 'Sem status';
    if (!statusCounts[s]) statusCounts[s] = { count: 0, valor: 0 };
    statusCounts[s].count++;
    statusCounts[s].valor += Number(row.valor_total);
  }
  
  const [recentes] = await db.query('SELECT o.*,c.nome AS nome_cliente FROM orcamento o LEFT JOIN cliente c ON c.id_cliente=o.id_cliente ORDER BY o.id_orcamento DESC LIMIT 4');
  
  const [orcamentosPeriodo] = await db.query(
    `SELECT o.*, c.nome AS nome_cliente 
     FROM orcamento o 
     LEFT JOIN cliente c ON c.id_cliente=o.id_cliente 
     WHERE o.data_criacao >= ? AND o.data_criacao < DATE_ADD(?, INTERVAL 1 MONTH) 
     ORDER BY o.id_orcamento DESC 
     LIMIT 50`,
    [start, start]
  );

  res.json({ mes, ativos, valorAtivo, novos: rows.length, aprovados, semanas, recentes, statusCounts, orcamentosPeriodo });
};
