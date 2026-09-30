import React from 'react';
import { ChevronRight, FileEdit, Send, CheckCircle, XCircle } from 'lucide-react';

export function DashboardPipeline() {
  const steps = [
    { id: 'rascunho', label: 'Rascunho', icon: FileEdit, color: 'text-[var(--ink-light)]' },
    { id: 'enviado', label: 'Enviado', icon: Send, color: 'text-[var(--ink)]' },
    { id: 'aprovado', label: 'Aprovado', icon: CheckCircle, color: 'text-green-600' },
    { id: 'recusado', label: 'Recusado', icon: XCircle, color: 'text-red-600' },
  ];

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold tracking-wide text-[var(--ink-light)] uppercase mb-3">
        Pipeline de Vendas
      </h2>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-[var(--paper)] border border-[var(--line)] rounded-lg overflow-hidden shadow-sm">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === steps.length - 1;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex-1 flex items-center justify-between p-4 hover:bg-[var(--surface)] transition-colors cursor-default group">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md bg-[var(--surface)] border border-[var(--line)] group-hover:border-[var(--line-strong)] transition-colors ${step.color}`}>
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-[var(--ink)]">{step.label}</span>
                    <span className="block text-xs text-[var(--ink-light)] mt-0.5">—</span>
                  </div>
                </div>
              </div>
              {!isLast && (
                <div className="hidden sm:flex items-center justify-center text-[var(--line-strong)] px-2">
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
