// Fluxo de orçamento: listagem com filtro automático, detalhe com troca de
// status, etapa de cliente em tabela e a tela de montagem. A camada HTTP
// (`api`) é substituída por dublês; nenhuma requisição sai do teste.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import api from "@/shared/services/api.js";
import { NumericInput } from "@/shared/components/ui";
import Orcamentos from "@/features/budgets/pages/BudgetsPage.jsx";
import StatusOrcamento from "@/features/budgets/pages/BudgetStatusPage.jsx";
import NovoOrcamentos from "@/features/budgets/pages/NewBudgetPage.jsx";
import { EscolherCliente } from "@/features/budgets/pages/CustomerStepPages.jsx";
import Clientes from "@/features/customers/pages/CustomersPage.jsx";
import { ADMIN, ATENDENTE, erroDaApi, renderComApp } from "./helpers/render.jsx";

vi.mock("@/shared/services/api.js", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

const clientes = [
  { id_cliente: 2, nome: "Café Central", telefone: "61 99911-1002", email: "compras@cafecentral.example", cpf_cnpj: "22222222222" },
  { id_cliente: 1, nome: "Studio Ipê", telefone: "61 99911-1001", email: "contato@studioipe.example", cpf_cnpj: "11111111111" },
];
const catalogo = {
  categorias: ["Offset"],
  itens: [
    { id_material: 7, categoria: "Offset", nome: "Offset 90g", custo_unitario: "0.1800", lucro_unitario: "0.1200" },
    { id_material: 8, categoria: "Laminação", nome: "Laminação fosca", custo_unitario: "0.4500", lucro_unitario: "0.2000" },
  ],
};
const orcamento = {
  id_orcamento: 5,
  id_cliente: 1,
  nome_cliente: "Studio Ipê",
  email: "contato@studioipe.example",
  data_criacao: "2026-11-01T15:00:00.000Z",
  data_validade: "2026-12-31T03:00:00.000Z",
  prazo_entrega: "2026-12-15T03:00:00.000Z",
  observacoes: "Entregar pela manhã.",
  status: "Não aprovado",
  subtotal: "100.0000",
  valor_total: "90.0000",
  desconto_tipo: "percentual",
  desconto_valor: "10.0000",
  versao: 3,
  itens: [{ id_item: 9, id_material: 7, tipo_produto: "Offset 90g", quantidade: 100, valor_unitario: "1.0000", valor_total: "100.0000" }],
};

/** Roteia api.get por URL, como a API real faria. */
function responderGet(rotas) {
  api.get.mockImplementation((url, config) => {
    const chave = Object.keys(rotas).find((rota) => url === rota || url.startsWith(`${rota}?`));
    if (!chave) return Promise.reject(new Error(`GET inesperado: ${url}`));
    const valor = rotas[chave];
    return Promise.resolve({ data: typeof valor === "function" ? valor(config) : valor });
  });
}

beforeEach(() => {
  for (const metodo of ["get", "post", "put", "patch", "delete"]) api[metodo].mockReset();
  sessionStorage.clear();
});

describe("NumericInput", () => {
  function Campo(props) {
    const aoMudar = vi.fn();
    const utils = render(<NumericInput aria-label="Valor" value="" onChange={aoMudar} {...props} />);
    return { aoMudar, campo: screen.getByLabelText("Valor"), ...utils };
  }

  it("não aceita sinal de menos nem letras", async () => {
    const { aoMudar, campo } = Campo({ decimals: 2 });
    await userEvent.type(campo, "-1a2,5x");
    expect(campo).toHaveValue("12,5");
    expect(aoMudar).toHaveBeenLastCalledWith(12.5);
    for (const [valor] of aoMudar.mock.calls) expect(valor === "" || valor >= 0).toBe(true);
  });

  it("quantidade aceita só inteiros e respeita o máximo", async () => {
    const { aoMudar, campo } = Campo({ decimals: 0, max: 500 });
    await userEvent.type(campo, "1,59");
    expect(campo).toHaveValue("159");
    await userEvent.type(campo, "9");
    expect(campo).toHaveValue("159");
    expect(aoMudar).toHaveBeenLastCalledWith(159);
  });

  it("mostra o valor formatado fora de edição e limita as casas decimais", async () => {
    const { rerender } = render(<NumericInput aria-label="Preço" value={1234.5} onChange={() => {}} decimals={4} />);
    expect(screen.getByLabelText("Preço")).toHaveValue("1.234,50");
    rerender(<NumericInput aria-label="Preço" value={0.33337} onChange={() => {}} decimals={4} />);
    expect(screen.getByLabelText("Preço")).toHaveValue("0,3334");
    rerender(<NumericInput aria-label="Preço" value="" onChange={() => {}} decimals={4} />);
    expect(screen.getByLabelText("Preço")).toHaveValue("");
  });

  it("entende ponto digitado como decimal e valor colado com milhar", async () => {
    const { aoMudar, campo } = Campo({ decimals: 2 });
    await userEvent.type(campo, "12.5");
    expect(aoMudar).toHaveBeenLastCalledWith(12.5);
    await userEvent.clear(campo);
    await userEvent.click(campo);
    await userEvent.paste("1.234,56");
    expect(aoMudar).toHaveBeenLastCalledWith(1234.56);
  });
});

describe("Lista de orçamentos", () => {
  const pagina = (itens = [orcamento]) => ({ itens, total: itens.length, page: 1, limit: 10 });

  it("aplica o status recebido na URL ao abrir a lista", async () => {
    responderGet({ "/api/orcamentos": pagina() });
    renderComApp(<Orcamentos />, { rota: "/orcamentos?status=Aprovado" });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/orcamentos", {
      params: { page: 1, busca: "", status: "Aprovado", limit: 10 },
    }));
    expect(screen.getByRole("button", { name: "Aprovado" })).toHaveAttribute("aria-pressed", "true");
  });

  it("filtra por status ao clicar, sem botão de filtrar", async () => {
    responderGet({ "/api/orcamentos": pagina() });
    renderComApp(<Orcamentos />);
    await screen.findByRole("link", { name: "#5" });
    expect(screen.queryByRole("button", { name: /^Filtrar$/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Aprovado" }));
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith("/api/orcamentos", {
        params: { page: 1, busca: "", status: "Aprovado", limit: 10 },
      }),
    );
    expect(screen.getByRole("button", { name: "Aprovado" })).toHaveAttribute("aria-pressed", "true");
  });

  it("busca sozinha depois de digitar", async () => {
    responderGet({ "/api/orcamentos": pagina() });
    renderComApp(<Orcamentos />);
    await screen.findByRole("link", { name: "#5" });
    await userEvent.type(screen.getByLabelText("Buscar orçamento"), "studio");
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith("/api/orcamentos", {
        params: { page: 1, busca: "studio", status: "", limit: 10 },
      }),
    );
  });

  it("muda o status na própria linha, recarrega a lista e avisa", async () => {
    responderGet({ "/api/orcamentos": pagina() });
    api.put.mockResolvedValue({ data: { status: "Finalizado", versao: 4 } });
    renderComApp(<Orcamentos />);
    const seletor = await screen.findByLabelText("Status do orçamento 5");
    expect(seletor).toHaveValue("Não aprovado");
    const chamadasAntes = api.get.mock.calls.length;

    await userEvent.selectOptions(seletor, "Finalizado");
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/api/orcamentos/status-orcamento/5", { status: "Finalizado", versao: 3 }),
    );
    expect(await screen.findByText("Orçamento #5 agora está como Finalizado.")).toBeInTheDocument();
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(chamadasAntes));
  });

  it("explica quando não há resultado para o filtro", async () => {
    responderGet({ "/api/orcamentos": pagina([]) });
    renderComApp(<Orcamentos />);
    expect(await screen.findByText(/Nenhum orçamento ainda/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Inativo" }));
    expect(await screen.findByText("Nenhum orçamento corresponde aos filtros.")).toBeInTheDocument();
  });
});

describe("Detalhe do orçamento", () => {
  const abrir = (usuario = ATENDENTE) =>
    renderComApp(
      <Routes>
        <Route path="/status-orcamento/:id" element={<StatusOrcamento />} />
        <Route path="/orcamentos" element={<h1>lista de orçamentos</h1>} />
      </Routes>,
      { usuario, rota: "/status-orcamento/5" },
    );

  beforeEach(() => {
    responderGet({ "/api/orcamentos/5": orcamento });
    api.put.mockResolvedValue({ data: { status: "Aprovado", versao: 4 } });
    api.delete.mockResolvedValue({ data: {} });
  });

  it("mostra cliente, datas, itens, observações e o desconto calculado", async () => {
    abrir();
    expect(await screen.findByRole("heading", { name: "Orçamento #5" })).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "Offset 90g" })).toBeInTheDocument();
    for (const data of ["01/11/2026", "31/12/2026", "15/12/2026"]) expect(screen.getByText(data)).toBeInTheDocument();
    expect(screen.getByText(/Entregar pela manhã/)).toBeInTheDocument();
    expect(screen.getByText(/−\sR\$\s10,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s90,00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute("href", "/orcamentos/5/editar");
  });

  it("só libera o PDF depois da aprovação", async () => {
    const { unmount } = abrir();
    expect(await screen.findByRole("button", { name: "Gerar PDF" })).toBeDisabled();
    unmount();
    responderGet({ "/api/orcamentos/5": { ...orcamento, status: "Aprovado" } });
    abrir();
    expect(await screen.findByRole("button", { name: "Gerar PDF" })).toBeEnabled();
  });

  it("aprova e finaliza enviando a versão atual", async () => {
    abrir();
    const seletor = await screen.findByLabelText("Status do orçamento 5");
    await userEvent.selectOptions(seletor, "Aprovado");
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("/api/orcamentos/status-orcamento/5", { status: "Aprovado", versao: 3 }),
    );
    expect(await screen.findByText("Orçamento #5 agora está como Aprovado.")).toBeInTheDocument();
    expect(within(seletor).getByRole("option", { name: "Finalizado" })).toBeInTheDocument();
  });

  it("avisa quando outra pessoa alterou o orçamento", async () => {
    api.put.mockRejectedValue(erroDaApi(409, "Orçamento alterado por outra pessoa. Atualize a página."));
    abrir();
    await userEvent.selectOptions(await screen.findByLabelText("Status do orçamento 5"), "Aprovado");
    expect(await screen.findByRole("alert")).toHaveTextContent("alterado por outra pessoa");
  });

  it("atendente não vê o botão de excluir; administrador exclui só depois de confirmar", async () => {
    const atendente = abrir(ATENDENTE);
    await screen.findByRole("button", { name: "Gerar PDF" });
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
    atendente.unmount();

    abrir(ADMIN);
    await userEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    expect(api.delete).not.toHaveBeenCalled();
    expect(screen.getByText(/Excluir o orçamento #5 e seus itens/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Excluir orçamento" }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/api/orcamentos/5"));
    expect(await screen.findByRole("heading", { name: "lista de orçamentos" })).toBeInTheDocument();
    expect(screen.getByText("Orçamento #5 excluído.")).toBeInTheDocument();
  });
});

describe("Escolha de cliente em tabela", () => {
  const abrir = () =>
    renderComApp(
      <Routes>
        <Route path="/orcamentos/novo" element={<EscolherCliente />} />
        <Route path="/orcamentos/novo/producao" element={<h1>montagem</h1>} />
      </Routes>,
      { rota: "/orcamentos/novo" },
    );

  it("lista os clientes, filtra pela busca e segue com o escolhido", async () => {
    responderGet({ "/api/clientes": clientes });
    abrir();
    expect(await screen.findByRole("cell", { name: "Studio Ipê" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "111.111.111-11" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "(61) 99911-1001" })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Buscar cliente"), "cafe");
    expect(screen.queryByRole("cell", { name: "Studio Ipê" })).not.toBeInTheDocument();
    expect(screen.getByText("1 de 2 clientes")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Selecionar Café Central" }));
    expect(await screen.findByRole("heading", { name: "montagem" })).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem("orcamento_cliente")).id_cliente).toBe(2);
  });

  it("permite continuar sem cliente e limpa a escolha anterior", async () => {
    sessionStorage.setItem("orcamento_cliente", JSON.stringify(clientes[0]));
    responderGet({ "/api/clientes": [] });
    abrir();
    expect(await screen.findByText(/Nenhum cliente cadastrado ainda/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: /Continuar sem cliente/ }));
    expect(await screen.findByRole("heading", { name: "montagem" })).toBeInTheDocument();
    expect(sessionStorage.getItem("orcamento_cliente")).toBeNull();
  });
});

describe("Montagem do orçamento", () => {
  const abrir = (rota = "/orcamentos/novo/producao") =>
    renderComApp(
      <Routes>
        <Route path="/orcamentos/novo/producao" element={<NovoOrcamentos />} />
        <Route path="/orcamentos/:id/editar" element={<NovoOrcamentos />} />
        <Route path="/status-orcamento/:id" element={<h1>detalhe</h1>} />
      </Routes>,
      { rota },
    );

  beforeEach(() => {
    responderGet({ "/api/materiais": catalogo, "/api/clientes": clientes, "/api/orcamentos/5": orcamento });
    api.post.mockResolvedValue({ data: { id: 12, id_orcamento: 12, valor_total: 54, versao: 1 } });
    api.put.mockResolvedValue({ data: { id: 5, id_orcamento: 5, valor_total: 90, versao: 4 } });
  });

  it("calcula subtotal, desconto e total enquanto a pessoa preenche", async () => {
    abrir();
    await userEvent.selectOptions(await screen.findByLabelText("Material 1"), "7");
    expect(screen.getByLabelText("Quantidade 1")).toHaveValue("1");
    expect(screen.getByLabelText("Valor unitário 1")).toHaveValue("0,30");
    expect(screen.getByLabelText("Material 2")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Quantidade 1"));
    await userEvent.type(screen.getByLabelText("Quantidade 1"), "200");
    expect(screen.getByLabelText("Subtotal 1")).toHaveTextContent(/R\$\s60,00/);

    await userEvent.type(screen.getByRole("textbox", { name: "Desconto em porcentagem" }), "10");
    const totais = screen.getByText("Total").closest("dl");
    expect(totais).toHaveTextContent(/Subtotal\s*R\$\s60,00/);
    expect(totais).toHaveTextContent(/Desconto\s*−\sR\$\s6,00/);
    expect(totais).toHaveTextContent(/Total\s*R\$\s54,00/);
  });

  it("mostra o preço de catálogo e avisa quando o valor fica abaixo do custo", async () => {
    abrir();
    await userEvent.selectOptions(await screen.findByLabelText("Material 1"), "7");
    expect(screen.getByText(/Catálogo:.*0,30/)).toBeInTheDocument();
    const valor = screen.getByLabelText("Valor unitário 1");
    await userEvent.clear(valor);
    await userEvent.type(valor, "0,10");
    expect(screen.getByText(/Abaixo do custo de.*0,18/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar orçamento" })).toBeEnabled();
  });

  it("não deixa digitar valores negativos em quantidade, valor e desconto", async () => {
    abrir();
    await userEvent.selectOptions(await screen.findByLabelText("Material 1"), "7");
    for (const rotulo of ["Quantidade 1", "Valor unitário 1"]) {
      const campo = screen.getByLabelText(rotulo);
      await userEvent.clear(campo);
      await userEvent.type(campo, "-5");
      expect(campo).toHaveValue("5");
    }
    const desconto = screen.getByRole("textbox", { name: "Desconto em porcentagem" });
    await userEvent.type(desconto, "-150");
    expect(desconto).toHaveValue("15");
    expect(screen.getByText("Total").closest("dl")).not.toHaveTextContent("-R$");
  });

  it("lista o que falta antes de salvar e não chama a API", async () => {
    abrir();
    await userEvent.click(await screen.findByRole("button", { name: "Salvar orçamento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha pelo menos um material.");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("trocar de cliente preserva os materiais já preenchidos", async () => {
    abrir();
    await userEvent.selectOptions(await screen.findByLabelText("Material 1"), "8");
    await userEvent.clear(screen.getByLabelText("Quantidade 1"));
    await userEvent.type(screen.getByLabelText("Quantidade 1"), "40");
    expect(screen.getByText("Orçamento sem cliente vinculado")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Escolher cliente" }));
    await userEvent.click(await screen.findByRole("button", { name: "Selecionar Studio Ipê", hidden: true }));

    expect(screen.getByText("Studio Ipê")).toBeInTheDocument();
    expect(screen.getByLabelText("Material 1")).toHaveValue("8");
    expect(screen.getByLabelText("Quantidade 1")).toHaveValue("40");

    await userEvent.click(screen.getByRole("button", { name: "Trocar cliente" }));
    await userEvent.click(await screen.findByRole("button", { name: "Selecionar Café Central", hidden: true }));
    expect(screen.getByText("Café Central")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantidade 1")).toHaveValue("40");
  });

  it("salva o orçamento novo, avisa e abre o detalhe", async () => {
    sessionStorage.setItem("orcamento_cliente", JSON.stringify(clientes[1]));
    abrir();
    await userEvent.selectOptions(await screen.findByLabelText("Material 1"), "7");
    await userEvent.clear(screen.getByLabelText("Quantidade 1"));
    await userEvent.type(screen.getByLabelText("Quantidade 1"), "200");
    await userEvent.type(screen.getByRole("textbox", { name: "Desconto em porcentagem" }), "10");
    await userEvent.type(screen.getByLabelText("Observações"), "Entregar na sexta.");
    await userEvent.click(screen.getByRole("button", { name: "Salvar orçamento" }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/orcamentos", {
        id_cliente: 1,
        itens: [{ id_item: null, id_material: 7, tipo_produto: "Offset 90g", quantidade: 200, valor_unitario: 0.3 }],
        desconto_tipo: "percentual",
        desconto_valor: 10,
        data_validade: null,
        prazo_entrega: null,
        observacoes: "Entregar na sexta.",
        versao: undefined,
      }),
    );
    expect(await screen.findByRole("heading", { name: "detalhe" })).toBeInTheDocument();
    expect(screen.getByText("Orçamento #12 criado.")).toBeInTheDocument();
    expect(sessionStorage.getItem("orcamento_cliente")).toBeNull();
  });

  it("na edição, reenvia prazo e validade no formato que a API aceita", async () => {
    abrir("/orcamentos/5/editar");
    expect(await screen.findByRole("heading", { name: "Editar orçamento #5" })).toBeInTheDocument();
    expect(screen.getByLabelText("Prazo de entrega")).toHaveValue("2026-12-15");
    expect(screen.getByLabelText("Observações")).toHaveValue("Entregar pela manhã.");
    await userEvent.click(screen.getByRole("button", { name: "Salvar orçamento" }));

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    const [url, corpo] = api.put.mock.calls[0];
    expect(url).toBe("/api/orcamentos/5");
    expect(corpo).toMatchObject({
      id_cliente: 1,
      versao: 3,
      data_validade: "2026-12-31",
      prazo_entrega: "2026-12-15",
      observacoes: "Entregar pela manhã.",
      desconto_valor: 10,
      itens: [{ id_item: 9, id_material: 7, quantidade: 100, valor_unitario: 1 }],
    });
    expect(await screen.findByText("Orçamento #5 atualizado.")).toBeInTheDocument();
  });

  it("mostra o erro da API em um aviso e mantém o formulário", async () => {
    api.post.mockRejectedValue(erroDaApi(422, "Material indisponível. Atualize o catálogo."));
    abrir();
    await userEvent.selectOptions(await screen.findByLabelText("Material 1"), "7");
    await userEvent.click(screen.getByRole("button", { name: "Salvar orçamento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Material indisponível");
    expect(screen.getByLabelText("Material 1")).toHaveValue("7");
  });
});

describe("Clientes", () => {
  beforeEach(() => responderGet({ "/api/clientes": clientes }));

  it("mostra vinte clientes por página e pagina o restante", async () => {
    const muitos = Array.from({ length: 21 }, (_, index) => ({ ...clientes[0], id_cliente: index + 1, nome: `Cliente ${index + 1}` }));
    responderGet({ "/api/clientes": muitos });
    renderComApp(<Clientes />);
    expect(await screen.findByText("Cliente 1")).toBeInTheDocument();
    expect(screen.queryByText("Cliente 21")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(screen.getByText("Cliente 21")).toBeInTheDocument();
    expect(screen.queryByText("Cliente 1")).not.toBeInTheDocument();
  });

  it("cadastra pelo botão Novo cliente, com máscara nos campos", async () => {
    api.post.mockResolvedValue({ data: { id_cliente: 3, nome: "Ateliê Raiz" } });
    renderComApp(<Clientes />);
    await userEvent.click(await screen.findByRole("button", { name: "Novo cliente" }));

    await userEvent.type(screen.getByLabelText("Nome do cliente ou da empresa"), "Ateliê Raiz");
    await userEvent.type(screen.getByLabelText("CPF ou CNPJ"), "66666666666");
    await userEvent.type(screen.getByLabelText("Telefone"), "61999111006");
    await userEvent.type(screen.getByLabelText("E-mail"), "oi@atelieraiz.example");
    expect(screen.getByLabelText("CPF ou CNPJ")).toHaveValue("666.666.666-66");
    expect(screen.getByLabelText("Telefone")).toHaveValue("(61) 99911-1006");

    await userEvent.click(screen.getByRole("button", { name: "Cadastrar cliente", hidden: true }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/clientes", {
        nome: "Ateliê Raiz",
        cpf_cnpj: "666.666.666-66",
        telefone: "(61) 99911-1006",
        email: "oi@atelieraiz.example",
      }),
    );
    expect(await screen.findByText("Cliente Ateliê Raiz cadastrado.")).toBeInTheDocument();
  });

  it("valida os campos antes de enviar", async () => {
    renderComApp(<Clientes />);
    await userEvent.click(await screen.findByRole("button", { name: "Novo cliente" }));
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar cliente", hidden: true }));
    expect(await screen.findByText("Informe o nome com pelo menos 3 letras.")).toBeInTheDocument();
    expect(screen.getByText("O CPF tem 11 dígitos e o CNPJ tem 14.")).toBeInTheDocument();
    expect(screen.getByText("Informe o telefone com DDD.")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("edita com os dados carregados e avisa o erro da exclusão", async () => {
    api.put.mockResolvedValue({ data: { id_cliente: 1, nome: "Studio Ipê Ltda" } });
    api.delete.mockRejectedValue(erroDaApi(409, "Cliente possui orçamentos. Exclua-os antes de remover o cadastro."));
    renderComApp(<Clientes />);

    await userEvent.click(await screen.findByRole("button", { name: "Editar Studio Ipê" }));
    const nome = screen.getByLabelText("Nome do cliente ou da empresa");
    expect(nome).toHaveValue("Studio Ipê");
    await userEvent.type(nome, " Ltda");
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações", hidden: true }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/clientes/1", expect.objectContaining({ nome: "Studio Ipê Ltda" })));

    await userEvent.click(await screen.findByRole("button", { name: "Excluir Café Central" }));
    expect(screen.getByText(/Excluir o cliente Café Central/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Excluir cliente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cliente possui orçamentos");
  });
});
