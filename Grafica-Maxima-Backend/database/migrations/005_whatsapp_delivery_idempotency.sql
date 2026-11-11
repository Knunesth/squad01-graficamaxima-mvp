ALTER TABLE relatorio_envio
  ALTER COLUMN status TYPE varchar(12);

ALTER TABLE relatorio_envio
  DROP CONSTRAINT IF EXISTS relatorio_envio_status_check;

ALTER TABLE relatorio_envio
  ADD CONSTRAINT relatorio_envio_status_check
  CHECK (status IN ('pending', 'sent', 'failed', 'unknown'));

ALTER TABLE relatorio_envio
  ADD CONSTRAINT relatorio_envio_report_recipient_unique
  UNIQUE (id_relatorio, destinatario);
