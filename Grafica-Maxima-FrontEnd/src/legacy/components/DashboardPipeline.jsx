import React from 'react';
import { ChevronRight, FileEdit, Send, CheckCircle, XCircle, Package } from 'lucide-react';
import { moeda } from '../../lib/format.js';

export function DashboardPipeline({ statusCounts = {}, filtroStatus, setFiltroStatus }) {
  const steps = [
    { id: 'Aberto', label: 'Aberto', icon: FileEdit, color: 'text-[var(--ink-light)]' },
    { id: 'Em análise', label: 'Em análise', icon: Send, color: 'text-[var(--ink)]' },
    { id: 'Aprovado', label: 'Aprovado', icon: CheckCircle, color: 'text-green-600' },
    { id: 'Finalizado', label: 'Finalizado', icon: Package, color: 'text-blue-600' },
  ];

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--ink-light)] uppercase">
          Pipeline de Vendas
        </h2>
        {filtroStatus && (
          <button 
            type="button"
            onClick={() => setFiltroStatus('')}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Limpar filtro
          </button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-[var(--surface)] border border-[var(--line)] rounded-xl overflow-hidden shadow-sm">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === steps.length - 1;
          const isActive = filtroStatus === step.id;
          
          const countInfo = statusCounts[step.id] || { count: 0, valor: 0 };
          
          return (
            <React.Fragment key={step.id}>
              <button 
                type="button"
                aria-pressed={isActive}
                onClick={() => setFiltroStatus(isActive ? '' : step.id)}
                className={`flex-1 flex flex-col px-5 py-4 text-left transition-colors group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)] ${isActive ? 'bg-[var(--paper)] shadow-inner ring-1 ring-inset ring-[var(--line-strong)]' : 'hover:bg-[var(--paper)]'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] group-hover:border-[var(--line-strong)] transition-colors ${isActive ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--ink-muted)]'}`}>
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className={`block text-sm font-semibold tracking-wide ${isActive ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}`}>{step.label}</span>
                    <span className="block text-xs text-[var(--ink-light)] mt-1 font-mono">
                      {countInfo.count} {countInfo.count === 1 ? 'orçamento' : 'orçamentos'} • {moeda(countInfo.valor)}
                    </span>
                  </div>
                </div>
              </button>
              {!isLast && (
                <div className="hidden sm:flex items-center justify-center text-[var(--line)] px-1 bg-[var(--surface)]">
                  <ChevronRight size={20} strokeWidth={1.5} />
                </div>
              )}
              {!isLast && (
                <div className="sm:hidden h-px bg-[var(--line)] w-full" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}
