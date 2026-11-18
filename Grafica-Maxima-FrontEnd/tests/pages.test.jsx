// Testes de tela: cada página é renderizada com os provedores reais e com a
// camada HTTP (`api`) substituída por dublês. Nenhuma requisição sai do teste.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import api from "@/shared/services/api.js";
import Acesso from "@/features/auth/pages/AccessPage.jsx";
import Usuarios from "@/features/users/pages/UsersPage.jsx";
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

  it("mostra a força da senha e os requisitos enquanto a pessoa digita", async () => {
    renderComApp(<Acesso cadastro />, { usuario: null, rota: "/cadastro" });
    expect(screen.getByText("Crie uma senha forte")).toBeInTheDocument();
    const campo = screen.getByLabelText("Senha");
    await userEvent.type(campo, "abc");
    expect(screen.getByText("Força da senha: Fraca")).toBeInTheDocument();
    await userEvent.clear(campo);
    await userEvent.type(campo, "SenhaBemLonga123");
    expect(screen.getByText("Força da senha: Boa")).toBeInTheDocument();
    await userEvent.clear(campo);
    await userEvent.type(campo, "Senha-Bem-Longa-123!");
    expect(screen.getByText("Força da senha: Forte")).toBeInTheDocument();
  });

  it("avisa que o login não aceita acentos nem caracteres especiais", async () => {
    renderComApp(<Acesso cadastro />, { usuario: null, rota: "/cadastro" });
    expect(screen.getByText(/Não use acentos, espaços ou caracteres especiais/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Login"), "Kauã");
    await userEvent.type(screen.getByLabelText("Senha"), "Senha-Bem-Longa-123!");
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "Senha-Bem-Longa-123!");
    await userEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));
    expect(await screen.findByText(/Use só letras sem acento/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("mostra e oculta a senha pelo botão", async () => {
    renderComApp(<Acesso cadastro />, { usuario: null, rota: "/cadastro" });
    const campo = screen.getByLabelText("Senha");
    expect(campo).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(campo).toHaveAttribute("type", "text");
    await userEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(campo).toHaveAttribute("type", "password");
  });

  it("exige maiúscula, minúscula e número, e que a confirmação confira", async () => {
    renderComApp(<Acesso cadastro />, { usuario: null, rota: "/cadastro" });
    await userEvent.type(screen.getByLabelText("Login"), "novo.usuario");
    await userEvent.type(screen.getByLabelText("Senha"), "somente-minusculas");
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "outra-coisa");
    await userEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));
    expect(await screen.findByText("Use letra maiúscula, minúscula e número")).toBeInTheDocument();
    expect(screen.getByText("As senhas não conferem")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("não aceita senha que contém o login", async () => {
    renderComApp(<Acesso cadastro />, { usuario: null, rota: "/cadastro" });
    await userEvent.type(screen.getByLabelText("Login"), "maria");
    await userEvent.type(screen.getByLabelText("Senha"), "Maria-Senha-1234");
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "Maria-Senha-1234");
    await userEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));
    expect((await screen.findAllByText("A senha não pode conter o seu login")).length).toBeGreaterThan(0);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("cria a conta e avisa que falta a liberação do administrador", async () => {
    api.post.mockResolvedValue({ data: { message: "Conta criada. Aguarde a liberação pelo administrador para entrar." } });
    const { setUsuario } = renderComApp(<Acesso cadastro />, { usuario: null, rota: "/cadastro" });
    await userEvent.type(screen.getByLabelText("Login"), "novo.usuario");
    await userEvent.type(screen.getByLabelText("Senha"), "Senha-Bem-Longa-123!");
    await userEvent.type(screen.getByLabelText("Confirmar senha"), "Senha-Bem-Longa-123!");
    await userEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Aguarde a liberação pelo administrador");
    expect(api.post).toHaveBeenCalledWith("/api/auth/register", { login: "novo.usuario", senha: "Senha-Bem-Longa-123!" });
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

  it("trava a conta administradora principal: sem trocar perfil, desativar ou redefinir senha", async () => {
    api.get.mockResolvedValue({
      data: [{ id_usuario: 9, nome: "admin", login: "admin", tipo: "admin", ativo: true, protegido: true }, ...lista],
    });
    renderComApp(<Usuarios />, { usuario: ADMIN, rota: "/usuarios" });
    expect(await screen.findByText(/Conta principal/)).toBeInTheDocument();
    expect(screen.getByLabelText("Perfil de admin")).toBeDisabled();
    const linha = screen.getByLabelText("Perfil de admin").closest("tr");
    expect(within(linha).getByRole("button", { name: "Desativar" })).toBeDisabled();
    expect(within(linha).queryByText("Redefinir senha")).not.toBeInTheDocument();
    // as demais contas seguem editáveis
    expect(within(linhaDe("bia")).getByRole("button", { name: "Desativar" })).toBeEnabled();
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

describe("Papel — novo tipo", () => {
  const catalogo = {
    categorias: ["Offset", "Kraft"],
    itens: [{ id_material: 1, categoria: "Offset", nome: "couchê 250", custo_fixo: 1, custo_unitario: 1, lucro_fixo: 1, lucro_unitario: 1, ativo: true }],
  };

  it("mostra \"Criar nova categoria\" no início da lista e já foca o campo do nome", async () => {
    api.get.mockResolvedValue({ data: catalogo });
    const { default: Papeis } = await import("@/features/catalog/pages/PapersPage.jsx");
    renderComApp(<Papeis />, { usuario: ADMIN, rota: "/papel" });
    await userEvent.click(await screen.findByRole("button", { name: /Novo tipo de papel/ }));

    const opcoes = within(screen.getByLabelText("Categoria")).getAllByRole("option").map((o) => o.textContent);
    expect(opcoes.slice(0, 3)).toEqual(["Selecione...", "+ Criar nova categoria", "Offset"]);

    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "+ Criar nova categoria");
    expect(await screen.findByLabelText("Nome da nova categoria")).toHaveFocus();
  });
});
