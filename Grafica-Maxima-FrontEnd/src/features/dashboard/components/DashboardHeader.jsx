import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Calendar } from 'lucide-react';
import { Button } from '../../../components/ui';

export function DashboardHeader({ mes, setMes }) {
  // Format the month input (YYYY-MM) into a readable PT-BR string (e.g. "Setembro de 2026")
  const formattedMonth = React.useMemo(() => {
    if (!mes) return '';
    const [y, m] = mes.split('-');
    const date = new Date(y, m - 1, 1);
    const text = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    return text.charAt(0).toUpperCase() + text.slice(1);
  }, [mes]);

  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">Dashboard</h1>
        <p className="text-sm text-[var(--ink-light)] mt-1">Visão geral dos orçamentos e performance comercial.</p>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="relative group flex items-center bg-[var(--paper)] border border-[var(--line)] rounded-md px-3 py-1.5 focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all">
          <Calendar size={16} className="text-[var(--ink-light)] mr-2" />
          <span className="text-sm font-medium text-[var(--ink)] pointer-events-none capitalize">
            {formattedMonth}
          </span>
          {/* Invisible native input over the text to trigger native picker */}
          <input 
            type="month" 
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label="Seletor de mês"
          />
        </div>
        
        <Link to="/orcamentos/novo" className="button button-primary gap-2 whitespace-nowrap">
          <PlusCircle size={18} />
          Criar orçamento
        </Link>
      </div>
    </header>
  );
}
