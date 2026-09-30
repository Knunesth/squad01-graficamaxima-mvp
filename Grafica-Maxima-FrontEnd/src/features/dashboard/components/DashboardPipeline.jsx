import React from 'react';
import { ChevronRight, FileEdit, Send, CheckCircle, XCircle, Package } from 'lucide-react';
import { moeda } from '../../../services/format';

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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-[var(--paper)] border border-[var(--line)] rounded-lg overflow-hidden shadow-sm">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === steps.length - 1;
          const isActive = filtroStatus === step.id;
          
          const countInfo = statusCounts[step.id] || { count: 0, valor: 0 };
          
          return (
            <React.Fragment key={step.id}>
              <button 
                type="button"
                onClick={() => setFiltroStatus(isActive ? '' : step.id)}
                className={`flex-1 flex flex-col p-4 text-left transition-colors group ${isActive ? 'bg-[var(--surface-hover)] shadow-inner ring-1 ring-inset ring-[var(--line-strong)]' : 'hover:bg-[var(--surface)]'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md bg-[var(--surface)] border border-[var(--line)] group-hover:border-[var(--line-strong)] transition-colors ${step.color} ${isActive ? 'border-[var(--accent)]' : ''}`}>
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <div>
                    <span className={`block text-sm font-medium ${isActive ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}`}>{step.label}</span>
                    <span className="block text-xs text-[var(--ink-light)] mt-0.5 font-mono">
                      {countInfo.count} {countInfo.count === 1 ? 'orç.' : 'orçs.'} • {moeda(countInfo.valor)}
                    </span>
                  </div>
                </div>
              </button>
              {!isLast && (
                <div className="hidden sm:flex items-center justify-center text-[var(--line-strong)] px-2 bg-[var(--paper)]">
                  <ChevronRight size={16} />
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
