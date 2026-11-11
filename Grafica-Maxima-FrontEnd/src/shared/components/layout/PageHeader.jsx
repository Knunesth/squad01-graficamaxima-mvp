import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";

/**
 * Cabeçalho de página. À direita mostra, nesta ordem de prioridade:
 * `children` (ações próprias da tela), o botão "Voltar" (`back`) ou o atalho
 * "Novo orçamento". Use `action={false}` para não mostrar nada.
 */
export function PageHeader({ title, subtitle, back, action = true, children }) {
  return (
    <header className="page-header">
      <div>
        <h1 tabIndex={-1} data-page-title>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children ? (
        <div className="page-header-actions">{children}</div>
      ) : back ? (
        <Link className="button button-subtle" to={back}>
          <ArrowLeft size={18} aria-hidden="true" /> Voltar
        </Link>
      ) : action ? (
        <Link className="button button-primary" to="/orcamentos/novo">
          <Plus size={18} aria-hidden="true" /> Novo orçamento
        </Link>
      ) : null}
    </header>
  );
}
