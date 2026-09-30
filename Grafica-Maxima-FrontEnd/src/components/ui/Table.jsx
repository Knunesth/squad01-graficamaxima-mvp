import React from 'react';

export function Table({ children, className = '', loading = false, empty = false, emptyMessage = 'Nenhum dado encontrado.' }) {
  return (
    <div className={`table-container ${className}`}>
      <table className="table">
        {children}
      </table>
      {loading && <div className="table-loading">Carregando...</div>}
      {!loading && empty && <div className="table-empty">{emptyMessage}</div>}
    </div>
  );
}
