import React, { useState } from 'react';
import { useDashboard } from '../../hooks/useDashboard';
import { Feedback, Spinner } from '../../components/ui';
import { mensagemErro } from '../../services/api';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardPipeline } from './components/DashboardPipeline';
import { DashboardKPIs } from './components/DashboardKPIs';
// O componente da tabela e empty states virão na Parte B

export default function DashboardFeature() {
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: dados, isLoading, error } = useDashboard(mes);
  const errorMessage = error ? mensagemErro(error) : '';

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 md:px-8 pb-20">
      <DashboardHeader mes={mes} setMes={setMes} />
      
      <Feedback error={errorMessage} />
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[var(--paper)] border border-[var(--line)] rounded-xl">
          <Spinner />
          <span className="mt-4 text-sm text-[var(--ink-light)]">Carregando indicadores...</span>
        </div>
      ) : !dados ? null : (
        <>
          <DashboardPipeline />
          <DashboardKPIs dados={dados} />
          
          {/* Espaço reservado para a Tabela da Parte B */}
          <div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-6 text-center shadow-sm">
            <span className="text-[var(--ink-light)] text-sm">Tabela de últimos orçamentos será implementada na Parte B</span>
          </div>
        </>
      )}
    </div>
  );
}
