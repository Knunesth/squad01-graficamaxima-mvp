import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderComApp } from "./helpers/render.jsx";
import { DashboardKPIs } from "@/features/dashboard/components/DashboardKPIs.jsx";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader.jsx";
import { DashboardAttention } from "@/features/dashboard/components/DashboardAttention.jsx";

const dados = {
  ativos: 3, valorAtivo: 450, aprovados: 1, valorAprovados: 200, novos: 2,
  totais: { valorAbertosCriados: 250, valorFinalizados: 100, finalizados: 1, novos: 2, aprovados: 1 },
  anterior: { valorAbertosCriados: 125, valorAprovados: 100, valorFinalizados: 50, novos: 2, aprovados: 1 },
  semanas: [{ semana: 1, valor: 300, valorAprovado: 200 }],
  statusCounts: { Aprovado: { count: 1, valor: 200 } },
};

describe("dashboard", () => {
  it("mostra indicadores, comparação e gráfico acessível", () => {
    renderComApp(<DashboardKPIs dados={dados} />);
    expect(screen.getByText("Valor em aberto")).toBeInTheDocument();
    expect(screen.getByText("Abertos criados em cada mês")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /semana 1: orçado/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Aprovado: 1 orçamento/i })).toHaveAttribute("href", "/orcamentos?status=Aprovado");
  });

  it("omite comparação quando não há base anterior", () => {
    renderComApp(<DashboardKPIs dados={{ ...dados, anterior: {} }} />);
    expect(screen.queryByText(/em relação ao mês anterior/)).not.toBeInTheDocument();
  });

  it("omite o gráfico quando o mês não teve orçamentos criados", () => {
    renderComApp(<DashboardKPIs dados={{ ...dados, novos: 0, semanas: [] }} semGrafico />);
    expect(screen.queryByRole("img", { name: /Valores por semana/ })).not.toBeInTheDocument();
    expect(screen.getByText("Vendas finalizadas")).toBeInTheDocument();
  });

  it("navega entre meses e volta ao mês atual", () => {
    const setMes = vi.fn();
    renderComApp(<DashboardHeader mes="2026-11" setMes={setMes} />);
    fireEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(setMes).toHaveBeenCalledWith("2026-10");
    fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(setMes).toHaveBeenCalledWith("2026-12");
    fireEvent.change(screen.getByLabelText("Escolher mês do dashboard"), { target: { value: "2026-06" } });
    expect(setMes).toHaveBeenCalledWith("2026-06");
  });

  it("mostra itens urgentes e estado em dia", () => {
    renderComApp(<DashboardAttention itens={[]} />);
    expect(screen.getByText(/Está tudo em dia/)).toBeInTheDocument();
    renderComApp(<DashboardAttention itens={[{ id_orcamento: 12, motivo: "validade", data_validade: "2026-11-12", valor_total: 50 }]} />);
    expect(screen.getByRole("link", { name: /#12/ })).toHaveAttribute("href", "/status-orcamento/12");
  });
});
