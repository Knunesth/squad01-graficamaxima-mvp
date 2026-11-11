import { useState } from "react";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard.js";
import { Feedback, Spinner } from "@/shared/components/ui";
import { mensagemErro } from "@/shared/services/api";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader.jsx";
import { DashboardKPIs } from "@/features/dashboard/components/DashboardKPIs.jsx";
import { DashboardTable } from "@/features/dashboard/components/DashboardTable.jsx";

export default function Dashboard() {
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return (
      now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0")
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
            <DashboardKPIs dados={dados} />
            <DashboardTable recentes={dados.recentes} />
          </>
        )
      )}
    </div>
  );
}
