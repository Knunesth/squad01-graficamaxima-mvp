import React from 'react';
import { Badge } from '../ui/Badge';

export function StatusBadge({ status }) {
  let variant = 'neutral';
  
  const statusLower = String(status).toLowerCase();
  
  if (statusLower === 'aprovado' || statusLower === 'concluído') variant = 'success';
  else if (statusLower === 'pendente' || statusLower === 'em análise') variant = 'warning';
  else if (statusLower === 'reprovado' || statusLower === 'cancelado') variant = 'danger';
  else if (statusLower === 'em produção') variant = 'info';

  return <Badge variant={variant}>{status}</Badge>;
}
