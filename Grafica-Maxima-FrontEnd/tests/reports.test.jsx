import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReportsPage from "@/features/reports/pages/ReportsPage.jsx";
import api from "@/shared/services/api.js";
import { renderComApp } from "./helpers/render.jsx";

vi.mock("@/shared/services/api.js", async (importOriginal) => ({
  ...(await importOriginal()),
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const metricas = {
  quotesCreated: 1, conversionRate: 50, finalizedSales: 1, revenue: 100,
  approvedProduction: { count: 0, value: 0 }, averageTicket: 100, topProducts: [],
};
const report = {
  id_relatorio: 7, data_inicio: "2026-11-01", data_fim: "2026-11-07", resumo: "Resumo de teste.",
  dados: { metrics: metricas, changes: {
    quotesCreated: {}, conversionRate: {}, finalizedSales: {}, revenue: {},
    approvedProduction: { count: {} }, averageTicket: {},
  } },
};

describe("relatórios", () => {
  beforeEach(() => {
    api.get.mockReset(); api.post.mockReset(); api.delete.mockReset();
    api.get.mockImplementation((url) => {
      if (url === "/api/reports") return Promise.resolve({ data: report });
      if (url === "/api/reports/history") return Promise.resolve({ data: { itens: [] } });
      if (url === "/api/reports/recipients") return Promise.resolve({ data: { itens: [], mode: "mock" } });
      if (url.endsWith("/deliveries")) return Promise.resolve({ data: { itens: [] } });
      return Promise.reject(new Error(`GET inesperado: ${url}`));
    });
  });

  it("pede confirmação em modal antes de reenviar", async () => {
    api.post.mockRejectedValueOnce({ response: { status: 409, data: { confirmationRequired: true, message: "Já enviado neste período." } } })
      .mockResolvedValueOnce({ data: { mode: "mock", results: [{ status: "sent" }] } });
    renderComApp(<ReportsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Enviar por WhatsApp agora" }));
    expect(await screen.findByText(/Relatório #7.*Já enviado/)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Reenviar relatório" }));
    await waitFor(() => expect(api.post).toHaveBeenLastCalledWith("/api/reports/7/send", { confirmResend: true }));
    expect(await screen.findByText("Envio simulado registrado.")).toBeInTheDocument();
  });
});
