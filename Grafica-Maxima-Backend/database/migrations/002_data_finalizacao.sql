ALTER TABLE orcamento
  ADD COLUMN IF NOT EXISTS data_finalizacao timestamptz;

UPDATE orcamento o
SET data_finalizacao = coalesce(
  (SELECT min(h.data_hora)
   FROM historico_log h
   WHERE h.tabela_afetada = 'orcamento'
     AND h.id_registro = o.id_orcamento
     AND h.acao = 'status'
     AND h.valor_novo ILIKE '%Finalizado%'),
  o.data_criacao
)
WHERE o.status = 'Finalizado' AND o.data_finalizacao IS NULL;

CREATE INDEX IF NOT EXISTS orcamento_relatorio_periodo
  ON orcamento (data_criacao, data_finalizacao, status);
