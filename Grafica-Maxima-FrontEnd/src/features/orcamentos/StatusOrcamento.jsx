import { useContext, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SessionContext } from "../../services/session.js";
import api, { mensagemErro } from "../../services/api.js";
import { Button, Feedback, Table, Spinner } from "../../components/ui";
import { PageHeader } from "../../components/layout";
import { StatusBadge } from "../../components/domain";
import { aprovado, dataBR, moeda } from "../../lib/format.js";
import {
  useOrcamento,
  useAlternarStatusOrcamento,
  useDeletarOrcamento,
} from "../../hooks/useOrcamentos.js";

export default function StatusOrcamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useContext(SessionContext);

  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const { data: quote, isLoading, error: queryError } = useOrcamento(id);
  const toggleStatus = useAlternarStatusOrcamento();
  const deleteMutation = useDeletarOrcamento();

  async function status() {
    if (toggleStatus.isPending) return;
    toggleStatus.mutate({
      id,
      status: aprovado(quote.status) ? "Não aprovado" : "Aprovado",
      versao: quote.versao,
    });
  }

  async function pdf() {
    setPdfBusy(true);
    setPdfError("");
    try {
      const response = await api.get(`/api/orcamentos/${id}/pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orcamento-${id}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (e.response?.data instanceof Blob) {
        try {
          setPdfError(JSON.parse(await e.response.data.text()).error);
        } catch {
          setPdfError("Não foi possível gerar o PDF.");
        }
      } else setPdfError(mensagemErro(e));
    } finally {
      setPdfBusy(false);
    }
  }

  async function excluir() {
    if (!window.confirm("Excluir este orçamento e seus itens?")) return;
    deleteMutation.mutate(id, {
      onSuccess: () => navigate("/orcamentos"),
    });
  }

  const errorMessage = queryError
    ? mensagemErro(queryError)
    : toggleStatus.error
      ? mensagemErro(toggleStatus.error)
      : deleteMutation.error
        ? mensagemErro(deleteMutation.error)
        : pdfError;

  return (
    <>
      <PageHeader
        title={`Orçamento #${id}`}
        subtitle={quote?.nome_cliente || "Detalhes do orçamento"}
        back="/orcamentos"
      />
      <Feedback error={errorMessage} />
      {isLoading ? (
        <div
          className="panel"
          style={{ display: "flex", justifyContent: "center", padding: "2rem" }}
        >
          <Spinner />{" "}
          <span style={{ marginLeft: "1rem" }}>Carregando detalhes...</span>
        </div>
      ) : quote ? (
        <section className="panel quote-detail">
          <div className="detail-summary">
            <p>
              Cliente:{" "}
              <strong>{quote.nome_cliente || "Cliente não vinculado"}</strong>
            </p>
            <p>Criação: {dataBR(quote.data_criacao)}</p>
            <p>Validade: {dataBR(quote.data_validade)}</p>
            <p>
              Status: <StatusBadge status={quote.status} />
            </p>
          </div>
          <Table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Quantidade</th>
                <th>Valor unitário</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {quote.itens.map((i) => (
                <tr key={i.id_item}>
                  <td>{i.tipo_produto}</td>
                  <td>{i.quantidade}</td>
                  <td>{moeda(i.valor_unitario)}</td>
                  <td>{moeda(i.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div
            style={{
              marginTop: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              alignItems: "flex-end",
              fontWeight: 500,
              fontSize: "1.1rem",
            }}
          >
            <p>Subtotal: {moeda(quote.subtotal)}</p>
            <p>
              Desconto:{" "}
              {moeda(Number(quote.subtotal) - Number(quote.valor_total))}
            </p>
            <h2>Total: {moeda(quote.valor_total)}</h2>
          </div>
          <div className="detail-actions" style={{ marginTop: "2rem" }}>
            <Link
              className="button button-neutral"
              to={`/orcamentos/${id}/editar`}
            >
              Editar
            </Link>
            <Button
              disabled={
                toggleStatus.isPending || deleteMutation.isPending || pdfBusy
              }
              onClick={status}
            >
              {toggleStatus.isPending ? (
                <Spinner />
              ) : aprovado(quote.status) ? (
                "Marcar como não aprovado"
              ) : (
                "Aprovar orçamento"
              )}
            </Button>
            <Button
              variant="neutral"
              disabled={pdfBusy || !aprovado(quote.status)}
              onClick={pdf}
            >
              {pdfBusy ? "Gerando..." : "Gerar PDF"}
            </Button>
            {usuario.tipo === "admin" && (
              <Button
                variant="subtle"
                disabled={
                  deleteMutation.isPending || toggleStatus.isPending || pdfBusy
                }
                onClick={excluir}
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}
