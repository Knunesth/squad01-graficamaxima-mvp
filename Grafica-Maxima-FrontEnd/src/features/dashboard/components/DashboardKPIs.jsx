import React from 'react';
import { Activity, FilePlus, CheckCircle } from 'lucide-react';
import { moeda } from '../../../services/format';

function Sparkline({ series, type = 'bar', color = '#0f172a' }) {
  if (!series || series.length === 0) return null;
  const hasData = series.some(s => s.valor > 0);
  if (!hasData) return <div className="h-12 w-full mt-auto pt-2"></div>;

  const max = Math.max(...series.map(s => s.valor), 1);
  
  if (type === 'line') {
    const points = series.map((s, i) => {
      const x = (i / (series.length - 1)) * 100;
      const y = 100 - (s.valor / max) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="h-12 w-full mt-auto pt-2">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <polyline fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
      </div>
    );
  }

  // Bar type
  return (
    <div className="h-12 w-full mt-auto pt-2 flex items-end justify-between gap-1">
      {series.map((s, i) => {
        const height = (s.valor / max) * 100;
        const isLast = i === series.length - 1;
        return (
          <div 
            key={i} 
            title={`Semana ${s.semana}: ${s.valor}`}
            className="w-full rounded-sm"
            style={{ 
              height: `${height}%`, 
              minHeight: s.valor > 0 ? '4px' : '0',
              backgroundColor: color,
              opacity: isLast ? 1 : 0.4
            }} 
          />
        );
      })}
    </div>
  );
}

export function DashboardKPIs({ dados }) {
  if (!dados) return null;

  const series = (key, divider = 1) => (dados.semanas || []).map(s => ({ semana: s.semana, valor: s[key] / divider }));

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
      {/* 1 KPI Principal Maior */}
      <article className="col-span-1 md:col-span-2 bg-[var(--surface)] border border-[var(--line)] rounded-xl p-5 shadow-sm flex flex-col relative overflow-hidden group">
        <header className="flex items-center gap-2 mb-4 text-[var(--ink-light)]">
          <Activity size={18} />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Valor Ativo</h2>
        </header>
        
        <div className="flex-1 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <strong className="block text-4xl md:text-5xl font-bold tracking-tight text-[var(--ink)] font-mono">
              {moeda(dados.valorAtivo)}
            </strong>
            <span className="block text-sm text-[var(--ink-light)] mt-2">
              Em {dados.ativos} orçamentos ativos no momento
            </span>
          </div>
          
          <div className="w-full md:w-1/3 min-w-[120px]">
             <Sparkline type="line" color="var(--accent)" label="Valor ativo (R$ mil)" series={series('ativos', 1000)} />
          </div>
        </div>
      </article>

      {/* 2 KPIs Secundários (Empilhados na lateral ou lado a lado em mobile) */}
      <div className="col-span-1 flex flex-col sm:flex-row md:flex-col gap-6 items-stretch">
        
        <article className="flex-1 bg-[var(--surface)] border border-[var(--line)] rounded-xl p-5 shadow-sm flex flex-col">
          <header className="flex items-center gap-2 mb-2 text-[var(--ink-light)]">
            <FilePlus size={16} />
            <h2 className="text-xs font-semibold uppercase tracking-wider">Novos Orçamentos</h2>
          </header>
          <div className="flex items-end justify-between gap-4 mt-auto">
            <strong className="text-3xl font-bold text-[var(--ink)] font-mono">{dados.novos}</strong>
            <div className="w-16">
              <Sparkline type="bar" color="var(--ink-light)" label="Novos" series={series('novos')} />
            </div>
          </div>
        </article>

        <article className="flex-1 bg-[var(--surface)] border border-[var(--line)] rounded-xl p-5 shadow-sm flex flex-col">
          <header className="flex items-center gap-2 mb-2 text-[var(--ink-light)]">
            <CheckCircle size={16} />
            <h2 className="text-xs font-semibold uppercase tracking-wider">Aprovados</h2>
          </header>
          <div className="flex items-end justify-between gap-4 mt-auto">
            <div>
              <strong className="block text-3xl font-bold text-[var(--ink)] font-mono">{dados.aprovados}</strong>
              <span className="block text-xs text-green-600 font-medium mt-1">
                {new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(dados.novos ? dados.aprovados / dados.novos : 0)} de conversão
              </span>
            </div>
            <div className="w-16">
              <Sparkline type="bar" color="#16a34a" label="Aprovados" series={series('aprovados')} />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
