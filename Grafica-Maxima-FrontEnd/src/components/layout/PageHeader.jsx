import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';

export function PageHeader({ title, subtitle, back, children }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children || (
        back ? (
          <Link className="button button-subtle gap-2" to={back}><ArrowLeft size={18} /> Voltar</Link>
        ) : (
          <Link className="button button-primary gap-2" to="/orcamentos/novo"><Plus size={18} /> Criar orçamento</Link>
        )
      )}
    </header>
  );
}
