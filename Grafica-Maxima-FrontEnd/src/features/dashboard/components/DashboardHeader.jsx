import { useState } from "react";
import { PageHeader } from "@/shared/components/layout";
import { CalendarDays } from "lucide-react";
import { Button } from "@/shared/components/ui";

export function DashboardHeader({ mes, setMes }) {
  const [open, setOpen] = useState(false);
  const [mesPendente, setMesPendente] = useState(mes);
  const [year, month] = mes.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit",
  }).format(new Date());
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral dos orçamentos da Gráfica Máxima."
      />
      <div className="dashboard-period">
        <span>
          Período: {label}
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
            onClick={() => {
              if (!open) setMesPendente(mes);
              setOpen(!open);
            }}
          >
            <CalendarDays size={18} aria-hidden="true" />
            {mes === currentMonth ? "Este mês" : "Alterar período"}
          </Button>
          {open && (
            <div className="period-popover" id="dashboard-month">
              <label htmlFor="month-input">Período do dashboard</label>
              <input
                id="month-input"
                type="month"
                value={mesPendente}
                onChange={(event) => {
                  if (event.target.value) setMesPendente(event.target.value);
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
              <Button onClick={() => {
                setMes(mesPendente);
                setOpen(false);
              }}>Aplicar</Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
