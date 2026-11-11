import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, Feedback, InputField, Table } from "@/shared/components/ui";
import { StatusBadge } from "@/shared/components/domain";

describe("Button", () => {
  it('é type="button" por padrão, para não enviar formulários sem querer', () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute("type", "button");
  });

  it('aceita type="submit", variante e classes extras', () => {
    render(
      <Button type="submit" variant="Neutral" className="extra">
        Enviar
      </Button>,
    );
    const botao = screen.getByRole("button", { name: "Enviar" });
    expect(botao).toHaveAttribute("type", "submit");
    expect(botao).toHaveClass("button", "button-neutral", "extra");
  });

  it("fica desabilitado e ocupado enquanto carrega", async () => {
    const aoClicar = vi.fn();
    render(<Button loading onClick={aoClicar} label="Gerando" />);
    const botao = screen.getByRole("button", { name: "Gerando" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("aria-busy", "true");
    await userEvent.click(botao);
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it("dispara onClick quando habilitado", async () => {
    const aoClicar = vi.fn();
    render(<Button onClick={aoClicar}>Clique</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Clique" }));
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });
});

describe("InputField", () => {
  it("liga o rótulo ao campo", () => {
    render(<InputField label="Login" name="login" />);
    const campo = screen.getByLabelText("Login");
    expect(campo).toHaveAttribute("name", "login");
    expect(campo).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("anuncia o erro e o associa ao campo", () => {
    render(<InputField label="Senha" id="senha" error="A senha é obrigatória" aria-describedby="dica" />);
    const campo = screen.getByLabelText("Senha");
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAttribute("aria-describedby", "dica senha-error");
    expect(screen.getByRole("alert")).toHaveTextContent("A senha é obrigatória");
    expect(screen.getByRole("alert")).toHaveAttribute("id", "senha-error");
  });
});

describe("Feedback", () => {
  it("mostra erro como alerta, com prioridade sobre a mensagem", () => {
    render(<Feedback error="Falhou" message="Deu certo" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("mostra mensagem de sucesso como status e nada quando vazio", () => {
    const { rerender, container } = render(<Feedback message="Conta criada." />);
    expect(screen.getByRole("status")).toHaveTextContent("Conta criada.");
    rerender(<Feedback />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Table", () => {
  const linhas = (
    <tbody>
      <tr>
        <td>Linha</td>
      </tr>
    </tbody>
  );

  it("expõe a legenda para leitores de tela", () => {
    render(<Table caption="Itens do orçamento">{linhas}</Table>);
    expect(screen.getByRole("region", { name: "Itens do orçamento" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "false");
  });

  it("mostra carregamento ou vazio, nunca os dois", () => {
    const { rerender } = render(
      <Table loading empty>
        {linhas}
      </Table>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Carregando...");
    expect(screen.queryByText("Nenhum dado encontrado.")).not.toBeInTheDocument();
    rerender(
      <Table empty emptyMessage="Nenhum cliente.">
        {linhas}
      </Table>,
    );
    expect(screen.getByText("Nenhum cliente.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  const classeDe = (status) => {
    const { container, unmount } = render(<StatusBadge status={status} />);
    const classe = container.firstChild.className.trim();
    unmount();
    return classe;
  };

  it("dá uma cor a cada status que a API envia", () => {
    expect(classeDe("Aprovado")).toContain("badge-success");
    expect(classeDe("Finalizado")).toContain("badge-brand");
    expect(classeDe("Não aprovado")).toContain("badge-warning");
    expect(classeDe("Em negociação")).toContain("badge-info");
    expect(classeDe("Em análise")).toContain("badge-info");
    expect(classeDe("Inativo")).toContain("badge-neutral");
    expect(classeDe("Status desconhecido")).toContain("badge-neutral");
  });

  it("mostra o texto do status", () => {
    render(<StatusBadge status="Finalizado" />);
    expect(screen.getByText("Finalizado")).toBeInTheDocument();
  });
});
