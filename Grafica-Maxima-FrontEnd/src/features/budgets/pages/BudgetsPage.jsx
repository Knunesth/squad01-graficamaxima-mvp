import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Eye, Pencil, Search } from "lucide-react";
import { mensagemErro } from "@/shared/services/api.js";
import { Button, Feedback, Table } from "@/shared/components/ui";
import { PageHeader } from "@/shared/components/layout";
import { StatusSelect, STATUS_OPCOES } from "@/shared/components/domain";
import { useToast } from "@/shared/hooks/useToast.js";
import { dataBR, moeda } from "@/shared/utils/format.js";
import {
  useOrcamentos,
  useAlternarStatusOrcamento,
} from "@/features/budgets/hooks/useBudgets.js";

const FILTROS = [["", "Todos"], ...STATUS_OPCOES.map((status) => [status, status])];

export default function Orcamentos() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusInicial = STATUS_OPCOES.includes(searchParams.get("status")) ? searchParams.get("status") : "";
  const [texto, setTexto] = useState("");
  const [query, setQuery] = useState({ page: 1, busca: "" });

  // A busca é aplicada sozinha, pouco depois de a pessoa parar de digitar.
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setQuery((atual) =>
          atual.busca === texto.trim() ? atual : { ...atual, page: 1, busca: texto.trim() },
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [texto]);

  const { data: result, isLoading, isFetching, error } = useOrcamentos({ ...query, status: statusInicial });
  const mudarStatus = useAlternarStatusOrcamento();

  function alterar(item, status) {
    mudarStatus.mutate(
      { id: item.id_orcamento, status, versao: item.versao },
      {
        onSuccess: () => toast.success(`Orçamento #${item.id_orcamento} agora está como ${status}.`),
        onError: (erro) => toast.error(mensagemErro(erro)),
      },
    );
  }

  const paginas = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <>
      <PageHeader
        title="Orçamentos"
        subtitle="Acompanhe os pedidos e atualize o status de cada um."
      />
      <div className="filters" role="search">
        <div className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar orçamento"
            placeholder="Buscar por número, nome ou e-mail do cliente"
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
          />
        </div>
        <div className="chips" role="group" aria-label="Filtrar por status">
          {FILTROS.map(([valor, rotulo]) => (
            <button
              key={rotulo}
              type="button"
              className="chip"
              aria-pressed={statusInicial === valor}
              onClick={() => {
                setQuery((atual) => ({ ...atual, page: 1 }));
                setSearchParams(valor ? { status: valor } : {});
              }}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      <Feedback error={error ? mensagemErro(error) : ""} />
      <section className="panel table-panel quotes-table" aria-busy={isFetching}>
        <Table
          caption="Orçamentos com cliente, data, valor, status e ações"
          loading={isLoading}
          empty={!isLoading && !result?.itens.length}
          emptyMessage={
            query.busca || statusInicial
              ? "Nenhum orçamento corresponde aos filtros."
              : "Nenhum orçamento ainda. Use o botão Novo orçamento para criar o primeiro."
          }
        >
          <thead>
            <tr>
              <th scope="col">Nº</th>
              <th scope="col">Cliente</th>
              <th scope="col">Criado em</th>
              <th scope="col" className="cell-number">Valor</th>
              <th scope="col">Status</th>
              <th scope="col" className="cell-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {result?.itens.map((item) => (
              <tr key={item.id_orcamento}>
                <td>
                  <Link to={`/status-orcamento/${item.id_orcamento}`}>#{item.id_orcamento}</Link>
                </td>
                <td>
                  <strong>{item.nome_cliente || "Sem cliente vinculado"}</strong>
                  {item.email && <small className="cell-sub">{item.email}</small>}
                </td>
                <td className="cell-number">{dataBR(item.data_criacao)}</td>
                <td className="cell-number">{moeda(item.valor_total)}</td>
                <td>
                  <StatusSelect
                    status={item.status}
                    label={`Status do orçamento ${item.id_orcamento}`}
                    disabled={mudarStatus.isPending}
                    onChange={(status) => alterar(item, status)}
                  />
                </td>
                <td className="cell-actions">
                  <div className="row-actions">
                    <Link
                      className="button button-subtle"
                      to={`/status-orcamento/${item.id_orcamento}`}
                      aria-label={`Ver orçamento ${item.id_orcamento}`}
                    >
                      <Eye size={16} aria-hidden="true" /> Ver
                    </Link>
                    <Link
                      className="button button-subtle"
                      to={`/orcamentos/${item.id_orcamento}/editar`}
                      aria-label={`Editar orçamento ${item.id_orcamento}`}
                    >
                      <Pencil size={16} aria-hidden="true" /> Editar
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {result && result.total > 0 && (
          <footer className="pagination">
            <small role="status">
              {(result.page - 1) * result.limit + 1}–
              {Math.min(result.page * result.limit, result.total)} de {result.total} orçamentos
            </small>
            <Button
              variant="subtle"
              disabled={query.page <= 1}
              onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
            >
              <ChevronLeft size={18} aria-hidden="true" /> Anterior
            </Button>
            <span>
              Página {result.page} de {paginas}
            </span>
            <Button
              variant="subtle"
              disabled={query.page >= paginas}
              onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
            >
              Próxima <ChevronRight size={18} aria-hidden="true" />
            </Button>
          </footer>
        )}
      </section>
    </>
  );
}
