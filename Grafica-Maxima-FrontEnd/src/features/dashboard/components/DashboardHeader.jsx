import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/shared/components/layout";
import { Button } from "@/shared/components/ui";

function moverMes(mes, delta) {
  const [ano, numero] = mes.split("-").map(Number);
  const data = new Date(ano, numero - 1 + delta, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

export function DashboardHeader({ mes, setMes }) {
  const [year, month] = mes.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
  const now = new Date();
  const currentMonth =
    now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral dos orçamentos da Gráfica Máxima." />
      <div className="dashboard-period toolbar" aria-label="Selecionar período">
        <Button variant="subtle" aria-label="Mês anterior" onClick={() => setMes(moverMes(mes, -1))}>
          <ChevronLeft size={18} aria-hidden="true" /> Anterior
        </Button>
        <strong aria-live="polite">{label}</strong>
        <input
          type="month"
          aria-label="Escolher mês do dashboard"
          value={mes}
          onChange={(event) => {
            if (event.target.value) setMes(event.target.value);
          }}
        />
        <Button variant="subtle" aria-label="Próximo mês" onClick={() => setMes(moverMes(mes, 1))}>
          <ChevronRight size={18} aria-hidden="true" /> Próximo
        </Button>
        <Button variant="neutral" onClick={() => setMes(currentMonth)}>
          <CalendarDays size={18} aria-hidden="true" /> Este mês
        </Button>
      </div>
    </>
  );
}
