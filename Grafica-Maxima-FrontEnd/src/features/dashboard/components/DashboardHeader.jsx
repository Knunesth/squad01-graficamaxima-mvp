import { useState } from "react";
import { PageHeader } from "../../../components/layout";
import { Button } from "../../../components/ui";

export function DashboardHeader({ mes, setMes }) {
  const [open, setOpen] = useState(false);
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
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral dos orçamentos da Gráfica Máxima."
      />
      <div className="dashboard-period">
        <span>
          Dados do período · {label.charAt(0).toUpperCase() + label.slice(1)}
        </span>
        <div
          className="period-control"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          <Button
            variant="neutral"
            aria-expanded={open}
            aria-controls="dashboard-month"
            onClick={() => setOpen(!open)}
          >
            {mes === currentMonth ? "Este mês" : "Alterar período"}
          </Button>
          {open && (
            <div className="period-popover" id="dashboard-month">
              <label htmlFor="month-input">Período do dashboard</label>
              <input
                id="month-input"
                type="month"
                value={mes}
                onChange={(event) => {
                  if (event.target.value) setMes(event.target.value);
                }}
              />
              <Button
                variant="subtle"
                onClick={() => {
                  setMes(currentMonth);
                  setOpen(false);
                }}
              >
                Este mês
              </Button>
              <Button onClick={() => setOpen(false)}>Aplicar</Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
