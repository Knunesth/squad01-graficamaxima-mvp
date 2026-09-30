import React, { useState } from 'react';
import { useDashboard } from '../../hooks/useDashboard';
import { Feedback, Spinner } from '../../components/ui';
import { mensagemErro } from '../../services/api';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardPipeline } from './components/DashboardPipeline';
import { DashboardKPIs } from './components/DashboardKPIs';
import { DashboardTable } from './components/DashboardTable';

export default function DashboardFeature() {
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [filtroStatus, setFiltroStatus] = useState('');

  const { data: dados, isLoading, error } = useDashboard(mes);
  const errorMessage = error ? mensagemErro(error) : '';

  return (
    <div className="gm-v2 w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 md:px-8 pb-20 flex flex-col gap-6 bg-[var(--paper)]">
      <DashboardHeader mes={mes} setMes={setMes} />
      
      <Feedback error={errorMessage} />
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[var(--surface)] border border-[var(--line)] rounded-xl">
          <Spinner />
          <span className="mt-4 text-sm text-[var(--ink-light)]">Carregando indicadores...</span>
        </div>
      ) : !dados ? null : (
        <>
          <DashboardPipeline 
            statusCounts={dados.statusCounts} 
            filtroStatus={filtroStatus} 
            setFiltroStatus={setFiltroStatus} 
          />
          <DashboardKPIs dados={dados} />
          
          <DashboardTable 
            orcamentosPeriodo={dados.orcamentosPeriodo} 
            filtroStatus={filtroStatus} 
            statusCounts={dados.statusCounts}
            totalNovos={dados.novos}
            mes={mes}
          />
        </>
      )}
    </div>
  );
}
