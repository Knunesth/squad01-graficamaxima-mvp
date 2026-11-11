// Utilitário de renderização: monta os mesmos provedores do app real
// (sessão, TanStack Query, avisos e roteador em memória) em volta do componente.
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { SessionContext } from "@/app/SessionContext.js";
import { ToastProvider } from "@/shared/components/ui/Toast.jsx";

export const ADMIN = { id_usuario: 1, nome: "Ana Admin", login: "ana", tipo: "admin" };
export const ATENDENTE = { id_usuario: 2, nome: "Bia Atendente", login: "bia", tipo: "atendente" };

export function renderComApp(ui, { usuario = ATENDENTE, rota = "/", setUsuario = vi.fn() } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const resultado = render(
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={{ usuario, setUsuario }}>
        <ToastProvider>
          <MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter>
        </ToastProvider>
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
  return { ...resultado, queryClient, setUsuario };
}

/** Erro no formato que o axios entrega quando a API responde com falha. */
export function erroDaApi(status, error) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, data: { error } } });
}
