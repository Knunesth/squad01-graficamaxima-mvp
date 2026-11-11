import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { AppRoutes } from "@/app/AppRoutes.jsx";
import { ADMIN, ATENDENTE, renderComApp } from "./helpers/render.jsx";

// As páginas são substituídas por marcadores: aqui interessa só a regra de
// roteamento (quem pode ver o quê), não o conteúdo de cada tela.
vi.mock("@/shared/services/api.js", () => ({
  default: { get: vi.fn(), post: vi.fn() },
  mensagemErro: () => "erro",
}));
vi.mock("@/features/dashboard/pages/DashboardPage.jsx", () => ({ default: () => <h1>pagina:dashboard</h1> }));
vi.mock("@/features/budgets/pages/BudgetsPage.jsx", () => ({ default: () => <h1>pagina:orcamentos</h1> }));
vi.mock("@/features/budgets/pages/NewBudgetPage.jsx", () => ({ default: () => <h1>pagina:montar-orcamento</h1> }));
vi.mock("@/features/budgets/pages/CustomerStepPages.jsx", () => ({
  CadastrarCliente: () => <h1>pagina:cadastrar-cliente</h1>,
  EscolherCliente: () => <h1>pagina:escolher-cliente</h1>,
}));
vi.mock("@/features/catalog/pages/PapersPage.jsx", () => ({ default: () => <h1>pagina:papel</h1> }));
vi.mock("@/features/settings/pages/SettingsPage.jsx", () => ({ default: () => <h1>pagina:configuracao</h1> }));
vi.mock("@/features/budgets/pages/BudgetStatusPage.jsx", () => ({ default: () => <h1>pagina:status-orcamento</h1> }));
vi.mock("@/features/users/pages/UsersPage.jsx", () => ({ default: () => <h1>pagina:usuarios</h1> }));
vi.mock("@/features/auth/pages/AccessPage.jsx", () => ({
  default: ({ cadastro }) => <h1>{cadastro ? "pagina:cadastro" : "pagina:login"}</h1>,
}));
vi.mock("@/features/customers/pages/CustomersPage.jsx", () => ({ default: () => <h1>pagina:clientes</h1> }));
vi.mock("@/features/reports/pages/ReportsPage.jsx", () => ({ default: () => <h1>pagina:relatorios</h1> }));

const abrir = (rota, usuario) => renderComApp(<AppRoutes usuario={usuario} />, { rota, usuario });
const titulo = (nome) => screen.findByRole("heading", { name: `pagina:${nome}` });

describe("AppRoutes — visitante", () => {
  it("qualquer rota leva ao login", async () => {
    for (const rota of ["/", "/orcamentos", "/usuarios", "/relatorios", "/nao-existe"]) {
      const { unmount } = abrir(rota, null);
      expect(await titulo("login")).toBeInTheDocument();
      unmount();
    }
  });

  it("/cadastro abre a criação de conta, sem menu lateral", async () => {
    abrir("/cadastro", null);
    expect(await titulo("cadastro")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("AppRoutes — atendente", () => {
  it("acessa as telas operacionais", async () => {
    const rotas = {
      "/": "dashboard",
      "/orcamentos": "orcamentos",
      "/clientes": "clientes",
      "/orcamentos/novo": "escolher-cliente",
      "/orcamentos/novo/cliente": "escolher-cliente",
      "/orcamentos/novo/cadastro": "cadastrar-cliente",
      "/orcamentos/novo/producao": "montar-orcamento",
      "/orcamentos/12/editar": "montar-orcamento",
      "/status-orcamento/12": "status-orcamento",
      "/papel": "papel",
      "/configuracao": "configuracao",
    };
    for (const [rota, nome] of Object.entries(rotas)) {
      const { unmount } = abrir(rota, ATENDENTE);
      expect(await titulo(nome)).toBeInTheDocument();
      unmount();
    }
  });

  it("é redirecionado ao dashboard nas telas de administrador", async () => {
    for (const rota of ["/usuarios", "/relatorios"]) {
      const { unmount } = abrir(rota, ATENDENTE);
      expect(await titulo("dashboard")).toBeInTheDocument();
      unmount();
    }
  });

  it("não vê os atalhos de administrador no menu", async () => {
    abrir("/", ATENDENTE);
    await titulo("dashboard");
    const menu = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(menu).toHaveTextContent("Orçamentos");
    expect(screen.queryByRole("link", { name: /Relatórios/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Usuários/ })).not.toBeInTheDocument();
    expect(screen.getByText("Atendente")).toBeInTheDocument();
  });

  it("rota desconhecida volta ao dashboard e /login não reabre com sessão ativa", async () => {
    for (const rota of ["/nao-existe", "/login", "/cadastro"]) {
      const { unmount } = abrir(rota, ATENDENTE);
      expect(await titulo("dashboard")).toBeInTheDocument();
      unmount();
    }
  });
});

describe("AppRoutes — administrador", () => {
  it("acessa usuários e relatórios", async () => {
    const usuarios = abrir("/usuarios", ADMIN);
    expect(await titulo("usuarios")).toBeInTheDocument();
    usuarios.unmount();
    abrir("/relatorios", ADMIN);
    expect(await titulo("relatorios")).toBeInTheDocument();
  });

  it("vê os atalhos de administrador e o link de pular para o conteúdo", async () => {
    abrir("/", ADMIN);
    await titulo("dashboard");
    expect(screen.getByRole("link", { name: /Relatórios/ })).toHaveAttribute("href", "/relatorios");
    expect(screen.getByRole("link", { name: /Usuários/ })).toHaveAttribute("href", "/usuarios");
    expect(screen.getByText("Administrador")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pular para o conteúdo" })).toHaveAttribute("href", "#main-content");
  });
});
