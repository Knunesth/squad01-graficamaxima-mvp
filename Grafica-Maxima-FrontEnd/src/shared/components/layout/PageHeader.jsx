import React from "react";
import { Link } from "react-router-dom";

export function PageHeader({ title, subtitle, back, children }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children ||
        (back ? (
          <Link className="button button-subtle gap-2" to={back}>
            Voltar
          </Link>
        ) : (
          <Link className="button button-primary gap-2" to="/orcamentos/novo">
            + Criar orçamento
          </Link>
        ))}
    </header>
  );
}
