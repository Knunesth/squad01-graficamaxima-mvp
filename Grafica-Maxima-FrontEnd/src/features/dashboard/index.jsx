import { useState } from "react";
import { useDashboard } from "../../hooks/useDashboard";
import { Feedback, Spinner } from "../../components/ui";
import { mensagemErro } from "../../services/api";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardKPIs } from "./components/DashboardKPIs";
import { DashboardTable } from "./components/DashboardTable";

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
