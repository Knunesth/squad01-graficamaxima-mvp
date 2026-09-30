import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip } from 'chart.js';
import { Activity, FilePlus, CheckCircle } from 'lucide-react';
import { moeda } from '../../../services/format';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip);

function Sparkline({ series, label, type = 'bar', color = '#0f172a' }) {
  if (!series || series.length === 0) return null;
  // Se todos os valores forem zero, evitamos renderizar o gráfico inteiro e mostramos só um tracejado ou nada
  const hasData = series.some(s => s.valor > 0);
  if (!hasData) return <div className="h-10 w-full flex items-end"><div className="w-full border-b border-dashed border-[var(--line)] mb-1"></div></div>;

  const Component = type === 'line' ? Line : Bar;
  
  const data = {
    labels: series.map(s => `Semana ${s.semana}`),
    datasets: [{
      label,
      data: series.map(s => s.valor),
      borderColor: color,
      backgroundColor: type === 'bar' ? series.map((_, i) => i === series.length - 1 ? color : `${color}66`) : 'transparent',
      borderWidth: type === 'line' ? 2 : 0,
      pointRadius: type === 'line' ? 2 : 0,
      barThickness: type === 'bar' ? 'flex' : undefined,
      maxBarThickness: 16,
      borderRadius: type === 'bar' ? 2 : 0
    }]
  };

  const options = {
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { display: false },
      y: { display: false, min: 0 }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  return (
    <div className="h-12 w-full mt-auto pt-2">
      <Component data={data} options={options} />
    </div>
  );
}

export function DashboardKPIs({ dados }) {
  if (!dados) return null;

  const series = (key, divider = 1) => (dados.semanas || []).map(s => ({ semana: s.semana, valor: s[key] / divider }));

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* 1 KPI Principal Maior */}
      <article className="col-span-1 md:col-span-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl p-6 shadow-sm flex flex-col relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] opacity-5 rounded-bl-[100%] transition-transform group-hover:scale-110 pointer-events-none" />
        
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
      <div className="col-span-1 flex flex-col sm:flex-row md:flex-col gap-6">
        
        <article className="flex-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl p-5 shadow-sm flex flex-col">
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

        <article className="flex-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl p-5 shadow-sm flex flex-col">
          <header className="flex items-center gap-2 mb-2 text-[var(--ink-light)]">
            <CheckCircle size={16} />
            <h2 className="text-xs font-semibold uppercase tracking-wider">Aprovados</h2>
          </header>
          <div className="flex items-end justify-between gap-4 mt-auto">
            <div>
              <strong className="block text-3xl font-bold text-[var(--ink)] font-mono">{dados.aprovados}</strong>
              <span className="block text-xs text-green-600 font-medium mt-1">
                {(dados.novos ? 100 * dados.aprovados / dados.novos : 0).toFixed(1)}% conversão
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
