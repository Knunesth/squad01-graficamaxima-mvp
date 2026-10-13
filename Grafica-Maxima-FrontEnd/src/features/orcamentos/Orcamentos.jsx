import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { mensagemErro } from "../../services/api.js";
import {
  Button,
  Feedback,
  InputField,
  Table,
  Spinner,
} from "../../components/ui";
import { PageHeader } from "../../components/layout";

import { aprovado, dataBR, moeda } from "../../lib/format.js";
import {
  useOrcamentos,
  useAlternarStatusOrcamento,
} from "../../hooks/useOrcamentos.js";

export default function Orcamentos() {
  const location = useLocation();
  const [query, setQuery] = useState({ page: 1, busca: "", status: "" });

  const { data: result, isLoading, error } = useOrcamentos(query);
  const toggleStatus = useAlternarStatusOrcamento();

  function filtrar(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setQuery({ page: 1, busca: form.get("busca"), status: form.get("status") });
  }

  async function alternar(item) {
    if (toggleStatus.isPending) return;
    toggleStatus.mutate({
      id: item.id_orcamento,
      status: aprovado(item.status) ? "Não aprovado" : "Aprovado",
      versao: item.versao,
    });
  }

  const errorMessage = error
    ? mensagemErro(error)
    : toggleStatus.error
      ? mensagemErro(toggleStatus.error)
      : "";

  return (
    <>
      <PageHeader
        title="Orçamentos realizados"
        subtitle="Consulte os pedidos e atualize a aprovação dos clientes."
      />
      <form className="quote-filters" onSubmit={filtrar}>
        <InputField
          label="Buscar orçamento"
          name="busca"
          placeholder="ID, nome ou e-mail do cliente"
        />
        <div className="field">
          <label htmlFor="status-filter">Status</label>
          <select name="status" id="status-filter">
            <option value="">Todos os status</option>
            <option>Aprovado</option>
            <option>Não aprovado</option>
            <option>Inativo</option>
          </select>
        </div>
        <Button variant="neutral" type="submit">
          Filtrar
        </Button>
      </form>
      <p className="list-help">
        Clique no status para alternar entre Aprovado e Não aprovado.
      </p>
      <Feedback error={errorMessage} message={location.state?.message} />
      <section className="panel quotes-table">
        <Table
          loading={isLoading}
          empty={!isLoading && (!result || !result.itens.length)}
          emptyMessage="Nenhum orçamento encontrado."
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>E-mail</th>
              <th>Data de criação</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {result?.itens.map((item) => (
              <tr key={item.id_orcamento}>
                <td>
                  <Link to={`/status-orcamento/${item.id_orcamento}`}>
                    #{item.id_orcamento}
                  </Link>
                </td>
                <td>{item.nome_cliente || "Cliente não vinculado"}</td>
                <td>{item.email || "—"}</td>
                <td>{dataBR(item.data_criacao)}</td>
                <td>{moeda(item.valor_total)}</td>
                <td>
                  <Button
                    variant="neutral"
                    disabled={toggleStatus.isPending}
                    onClick={() => alternar(item)}
                    aria-label={`Alterar aprovação do orçamento ${item.id_orcamento}`}
                  >
                    {toggleStatus.isPending &&
                    toggleStatus.variables?.id === item.id_orcamento ? (
                      <Spinner />
                    ) : (
                      <span>
                        {aprovado(item.status)
                          ? "Aprovado"
                          : item.status === "Inativo"
                            ? "Inativo"
                            : "Não aprovado"}
                      </span>
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {result && (
          <footer className="pagination">
            <small>
              Exibindo {result.total ? (result.page - 1) * result.limit + 1 : 0}
              –{Math.min(result.page * result.limit, result.total)} de{" "}
              {result.total} orçamentos
            </small>
            <Button
              variant="subtle"
              disabled={query.page <= 1}
              onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
            >
              Anterior
            </Button>
            <span>
              {result.page} de{" "}
              {Math.max(1, Math.ceil(result.total / result.limit))}
            </span>
            <Button
              variant="neutral"
              disabled={query.page * result.limit >= result.total}
              onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
            >
              Próxima
            </Button>
          </footer>
        )}
      </section>
    </>
  );
}
