import { useState } from "react";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard.js";
import { Feedback, Spinner } from "@/shared/components/ui";
import { mensagemErro } from "@/shared/services/api";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader.jsx";
import { DashboardKPIs } from "@/features/dashboard/components/DashboardKPIs.jsx";
import { DashboardTable } from "@/features/dashboard/components/DashboardTable.jsx";
import { DashboardAttention } from "@/features/dashboard/components/DashboardAttention.jsx";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return (
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(now)
    );
  });
  const { data: dados, isLoading, error } = useDashboard(mes);
  return (
    <div className="dashboard">
      <DashboardHeader mes={mes} setMes={setMes} />
      <Feedback error={error ? mensagemErro(error) : ""} />
      {isLoading ? (
        <div className="dashboard-loading" role="status">
          <Spinner /> Carregando indicadores...
        </div>
      ) : (
        dados && (
          <>
            <DashboardKPIs dados={dados} semGrafico={!dados.novos} />
            {!dados.novos && (
              <section className="panel dashboard-empty">
                <h2>Nenhum orçamento neste mês</h2>
                <p>Escolha outro período ou crie um orçamento para começar.</p>
                <Link className="button button-primary" to="/orcamentos/novo"><Plus size={18} aria-hidden="true" /> Novo orçamento</Link>
              </section>
            )}
            <DashboardAttention itens={dados.precisamAtencao} />
            <DashboardTable recentes={dados.recentes} />
          </>
        )
      )}
    </div>
  );
}
