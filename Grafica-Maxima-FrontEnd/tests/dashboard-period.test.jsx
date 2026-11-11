import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderComApp } from "./helpers/render.jsx";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader.jsx";

function PeriodoDeTeste() {
  const [mes, setMes] = useState("2026-06");
  return <DashboardHeader mes={mes} setMes={setMes} />;
}

describe("período do dashboard", () => {
  it("aplica o mês escolhido somente ao clicar em Aplicar", () => {
    renderComApp(<PeriodoDeTeste />);
    fireEvent.click(screen.getByRole("button", { name: "Alterar período" }));
    fireEvent.change(screen.getByLabelText("Período do dashboard"), { target: { value: "2026-07" } });
    expect(screen.getByText("Período: junho de 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(screen.getByText("Período: julho de 2026")).toBeInTheDocument();
    expect(screen.queryByLabelText("Período do dashboard")).not.toBeInTheDocument();
  });

  it("descarta a escolha ao fechar sem aplicar", () => {
    renderComApp(<PeriodoDeTeste />);
    fireEvent.click(screen.getByRole("button", { name: "Alterar período" }));
    fireEvent.change(screen.getByLabelText("Período do dashboard"), { target: { value: "2026-07" } });
    fireEvent.click(screen.getByRole("button", { name: "Alterar período" }));
    fireEvent.click(screen.getByRole("button", { name: "Alterar período" }));
    expect(screen.getByLabelText("Período do dashboard")).toHaveValue("2026-06");
  });
});
