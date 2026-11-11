import React from "react";

export function Table({
  children,
  className = "",
  loading = false,
  empty = false,
  emptyMessage = "Nenhum dado encontrado.",
  caption,
}) {
  return (
    <div className={`table-container ${className}`} role="region" aria-label={caption || "Tabela de dados"} tabIndex={0}>
      <table className="table" aria-busy={loading}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
      {loading && <div className="table-loading" role="status">Carregando...</div>}
      {!loading && empty && <div className="table-empty">{emptyMessage}</div>}
    </div>
  );
}
