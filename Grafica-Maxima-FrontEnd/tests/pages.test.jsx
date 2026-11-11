// Testes de tela: cada página é renderizada com os provedores reais e com a
// camada HTTP (`api`) substituída por dublês. Nenhuma requisição sai do teste.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import api from "@/shared/services/api.js";
import Acesso from "@/features/auth/pages/AccessPage.jsx";
import Usuarios from "@/features/users/pages/UsersPage.jsx";
import CalculadoraM2 from "@/features/calculator/CalculatorM2.jsx";
import { ADMIN, ATENDENTE, erroDaApi, renderComApp } from "./helpers/render.jsx";

vi.mock("@/shared/services/api.js", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

beforeEach(() => {
  for (const metodo of ["get", "post", "put", "patch", "delete"]) api[metodo].mockReset();
});

describe("Acesso — login", () => {
  const preencher = async (login, senha) => {
    if (login) await userEvent.type(screen.getByLabelText("Login"), login);
    if (senha) await userEvent.type(screen.getByLabelText("Senha"), senha);
    await userEvent.click(screen.getByRole("button", { name: /Entrar no sistema|Criar minha conta/ }));
  };

  it("valida os campos antes de chamar a API", async () => {
    renderComApp(<Acesso />, { usuario: null, rota: "/login" });
    await preencher("ab", "");
    expect(await screen.findByText("Mínimo 3 caracteres")).toBeInTheDocument();
    expect(screen.getByText("A senha é obrigatória")).toBeInTheDocument();
    expect(screen.getByLabelText("Login")).toHaveAttribute("aria-invalid", "true");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("entra e guarda o usuário na sessão", async () => {
    api.post.mockResolvedValue({ data: { usuario: ADMIN } });
    const { setUsuario } = renderComApp(<Acesso />, { usuario: null, rota: "/login" });
    await preencher("ana", "senha-da-ana-123");
    await waitFor(() => expect(setUsuario).toHaveBeenCalledWith(ADMIN));
    expect(api.post).toHaveBeenCalledWith("/api/auth/login", { login: "ana", senha: "senha-da-ana-123" });
  });

  it("mostra a mensagem do servidor quando o login é recusado", async () => {
    api.post.mockRejectedValue(erroDaApi(401, "Login ou senha inválidos, ou conta ainda não liberada."));
    const { setUsuario } = renderComApp(<Acesso />, { usuario: null, rota: "/login" });
    await preencher("ana", "senha-errada");
    expect(await screen.findByRole("alert")).toHaveTextContent("Login ou senha inválidos, ou conta ainda não liberada.");
    expect(setUsuario).not.toHaveBeenCalled();
  });

  it("explica quando o servidor está fora do ar", async () => {
    api.post.mockRejectedValue(Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" }));
    renderComApp(<Acesso />, { usuario: null, rota: "/login" });
    await preencher("ana", "senha-da-ana-123");
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível conectar ao servidor.");
  });

  it("campo de senha usa type=password e autocomplete correto", () => {
    renderComApp(<Acesso />, { usuario: null, rota: "/login" });
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText("Login")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByRole("link", { name: /Criar conta/ })).toHaveAttribute("href", "/cadastro");
  });
});

describe("Acesso — cadastro", () => {
  it("exige senha de 12 caracteres, igual à regra da API", async () => {
    renderComApp(<Acesso cadastro />, { usuario: null, rota: "/cadastro" });
    await userEvent.type(screen.getByLabelText("Login"), "novo.usuario");
    await userEvent.type(screen.getByLabelText("Senha"), "curta");
    await userEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));
    expect(await screen.findByText("A senha deve ter no mínimo 12 caracteres")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("cria a conta e avisa que falta a liberação do administrador", async () => {
    api.post.mockResolvedValue({ data: { message: "Conta criada. Aguarde a liberação pelo administrador para entrar." } });
    const { setUsuario } = renderComApp(<Acesso cadastro />, { usuario: null, rota: "/cadastro" });
    await userEvent.type(screen.getByLabelText("Login"), "novo.usuario");
    await userEvent.type(screen.getByLabelText("Senha"), "senha-bem-longa-123");
    await userEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Aguarde a liberação pelo administrador");
    expect(api.post).toHaveBeenCalledWith("/api/auth/register", { login: "novo.usuario", senha: "senha-bem-longa-123" });
    expect(setUsuario).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "new-password");
  });
});

describe("Usuários", () => {
  const lista = [
    { id_usuario: 3, nome: "novo", login: "novo", tipo: "atendente", ativo: false },
    { id_usuario: 2, nome: "Bia", login: "bia", tipo: "atendente", ativo: true },
    { id_usuario: 1, nome: "Ana", login: "ana", tipo: "admin", ativo: true },
  ];
  const linhaDe = (login) => screen.getByRole("cell", { name: login }).closest("tr");

  beforeEach(() => {
    api.get.mockResolvedValue({ data: lista });
    api.patch.mockResolvedValue({ data: { message: "ok" } });
  });

  it("lista as contas com perfil e estado de acesso", async () => {
    renderComApp(<Usuarios />, { usuario: ADMIN, rota: "/usuarios" });
    expect(await screen.findByRole("cell", { name: "novo" })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/auth/usuarios");
    expect(within(linhaDe("novo")).getByRole("button", { name: "Liberar acesso" })).toBeEnabled();
    expect(within(linhaDe("bia")).getByRole("button", { name: "Desativar" })).toBeEnabled();
    expect(within(linhaDe("bia")).getByLabelText("Perfil de bia")).toHaveValue("atendente");
  });

  it("não deixa o administrador alterar a própria conta", async () => {
    renderComApp(<Usuarios />, { usuario: ADMIN, rota: "/usuarios" });
    await screen.findByRole("cell", { name: "ana" });
    const propria = within(linhaDe("ana"));
    expect(propria.getByLabelText("Perfil de ana")).toBeDisabled();
    expect(propria.getByRole("button", { name: "Desativar" })).toBeDisabled();
    expect(propria.queryByText("Redefinir senha")).not.toBeInTheDocument();
  });

  it("libera o acesso mantendo o perfil", async () => {
    renderComApp(<Usuarios />, { usuario: ADMIN, rota: "/usuarios" });
    await screen.findByRole("cell", { name: "novo" });
    await userEvent.click(within(linhaDe("novo")).getByRole("button", { name: "Liberar acesso" }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/api/auth/usuarios/3", { tipo: "atendente", ativo: true }));
  });

  it("troca o perfil mantendo o estado de acesso", async () => {
    renderComApp(<Usuarios />, { usuario: ADMIN, rota: "/usuarios" });
    await screen.findByRole("cell", { name: "bia" });
    await userEvent.selectOptions(screen.getByLabelText("Perfil de bia"), "admin");
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/api/auth/usuarios/2", { tipo: "admin", ativo: true }));
  });

  it("redefine a senha de outra conta", async () => {
    renderComApp(<Usuarios />, { usuario: ADMIN, rota: "/usuarios" });
    await screen.findByRole("cell", { name: "bia" });
    const linha = within(linhaDe("bia"));
    await userEvent.click(linha.getByText("Redefinir senha"));
    await userEvent.type(linha.getByLabelText(/Nova senha/), "senha-redefinida-123");
    await userEvent.click(linha.getByRole("button", { name: "Confirmar redefinição" }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/api/auth/usuarios/2/senha", { nova_senha: "senha-redefinida-123" }));
  });

  it("mostra o erro devolvido pela API", async () => {
    api.get.mockRejectedValue(erroDaApi(403, "Apenas administradores podem realizar esta ação."));
    renderComApp(<Usuarios />, { usuario: ADMIN, rota: "/usuarios" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Apenas administradores");
  });
});

describe("Calculadora de m²", () => {
  const tipos = [
    { tipo: "banner", preco_base_m2: "48.0000" },
    { tipo: "adesivo", preco_base_m2: "36.0000" },
  ];
  const calculo = { area_total_m2: 3, valor_unitario: 144, valor_total: 144 };

  beforeEach(() => {
    api.get.mockResolvedValue({ data: { tipos } });
    api.post.mockResolvedValue({ data: { calculo } });
  });

  it("carrega os tipos de serviço com o preço por m²", async () => {
    renderComApp(<CalculadoraM2 aoFechar={vi.fn()} />);
    expect(await screen.findByRole("option", { name: /BANNER/, hidden: true })).toHaveTextContent(/R\$\s48,00\/m²/);
    expect(api.get).toHaveBeenCalledWith("/api/calculo/tipos");
    expect(screen.getByLabelText(/Tipo de Serviço/)).toHaveValue("banner");
  });

  it("exige medidas maiores que zero antes de chamar a API", async () => {
    renderComApp(<CalculadoraM2 aoFechar={vi.fn()} />);
    await screen.findByRole("option", { name: /BANNER/, hidden: true });
    await userEvent.click(screen.getByRole("button", { name: "Simular Valores", hidden: true }));
    expect(await screen.findByRole("alert", { hidden: true })).toHaveTextContent("valores maiores que zero");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("simula e mostra área, valor unitário e total", async () => {
    renderComApp(<CalculadoraM2 aoFechar={vi.fn()} />);
    await screen.findByRole("option", { name: /BANNER/, hidden: true });
    await userEvent.type(screen.getByLabelText(/Largura/), "2");
    await userEvent.type(screen.getByLabelText(/Altura/), "1.5");
    await userEvent.click(screen.getByRole("button", { name: "Simular Valores", hidden: true }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/calculo/metro-quadrado/simulacao", {
        tipo_servico: "banner",
        largura: 2,
        altura: 1.5,
        quantidade: 1,
        id_orcamento: null,
      }),
    );
    const resultado = await screen.findByRole("status", { hidden: true });
    expect(resultado).toHaveTextContent("3,00 m²");
    expect(resultado).toHaveTextContent(/Valor Total:\s*R\$\s144,00/);
  });

  it("mostra o erro devolvido pela API e fecha pelo botão", async () => {
    api.post.mockRejectedValue(erroDaApi(422, "Confira os dados do cálculo."));
    const aoFechar = vi.fn();
    renderComApp(<CalculadoraM2 aoFechar={aoFechar} />);
    await screen.findByRole("option", { name: /BANNER/, hidden: true });
    await userEvent.type(screen.getByLabelText(/Largura/), "2");
    await userEvent.type(screen.getByLabelText(/Altura/), "2");
    await userEvent.click(screen.getByRole("button", { name: "Simular Valores", hidden: true }));
    expect(await screen.findByRole("alert", { hidden: true })).toHaveTextContent("Confira os dados do cálculo.");
    await userEvent.click(screen.getByRole("button", { name: "Fechar calculadora", hidden: true }));
    expect(aoFechar).toHaveBeenCalledTimes(1);
  });

  // O App renderiza a calculadora fora de <Routes>; o orçamento aberto é
  // identificado pelo endereço da página.
  it("vincula o item ao orçamento aberto (edição ou detalhe) e avisa", async () => {
    for (const rota of ["/orcamentos/5/editar", "/status-orcamento/5"]) {
      api.post.mockClear();
      const { unmount } = renderComApp(<CalculadoraM2 aoFechar={vi.fn()} />, { rota });
      await screen.findByRole("option", { name: /BANNER/, hidden: true });
      expect(screen.getByRole("heading", { name: "Vincular Item ao Orçamento #5", hidden: true })).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText(/Largura/), "2");
      await userEvent.type(screen.getByLabelText(/Altura/), "1.5");
      await userEvent.click(screen.getByRole("button", { name: "Calcular & Salvar Item", hidden: true }));
      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith("/api/calculo/metro-quadrado", {
          tipo_servico: "banner",
          largura: 2,
          altura: 1.5,
          quantidade: 1,
          id_orcamento: 5,
        }),
      );
      expect(await screen.findByText("Item adicionado ao orçamento #5.")).toBeInTheDocument();
      unmount();
    }
  });

  it("fora de um orçamento, continua só simulando", async () => {
    renderComApp(<CalculadoraM2 aoFechar={vi.fn()} />, { rota: "/orcamentos" });
    await screen.findByRole("option", { name: /BANNER/, hidden: true });
    expect(screen.getByRole("heading", { name: "Calculadora de M²", hidden: true })).toBeInTheDocument();
  });
});
