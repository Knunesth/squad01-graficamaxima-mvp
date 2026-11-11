CREATE INDEX IF NOT EXISTS orcamento_finalizado_data_finalizacao_idx
  ON orcamento (data_finalizacao)
  INCLUDE (valor_total)
  WHERE status = 'Finalizado';

CREATE INDEX IF NOT EXISTS orcamento_data_criacao_status_idx
  ON orcamento (data_criacao, status)
  INCLUDE (valor_total);
