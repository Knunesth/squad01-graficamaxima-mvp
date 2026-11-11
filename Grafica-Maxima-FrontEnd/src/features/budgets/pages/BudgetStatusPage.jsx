import { useContext, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileDown, Pencil, Trash2 } from "lucide-react";
import { SessionContext } from "@/app/SessionContext.js";
import api, { mensagemErro } from "@/shared/services/api.js";
import { Button, Feedback, Table, Spinner } from "@/shared/components/ui";
import { PageHeader } from "@/shared/components/layout";
import { StatusSelect } from "@/shared/components/domain";
import { useToast } from "@/shared/hooks/useToast.js";
import { aprovado, dataBR, inteiro, moeda } from "@/shared/utils/format.js";
import {
  useOrcamento,
  useAlternarStatusOrcamento,
  useDeletarOrcamento,
} from "@/features/budgets/hooks/useBudgets.js";

export default function StatusOrcamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { usuario } = useContext(SessionContext);
  const [pdfBusy, setPdfBusy] = useState(false);

  const { data: quote, isLoading, error: queryError } = useOrcamento(id);
  const mudarStatus = useAlternarStatusOrcamento();
  const deleteMutation = useDeletarOrcamento();
  const ocupado = mudarStatus.isPending || deleteMutation.isPending || pdfBusy;

  function alterarStatus(status) {
    mudarStatus.mutate(
      { id, status, versao: quote.versao },
      {
        onSuccess: () => toast.success(`Orçamento #${id} agora está como ${status}.`),
        onError: (erro) => toast.error(mensagemErro(erro)),
      },
    );
  }

  async function pdf() {
    setPdfBusy(true);
    try {
      const response = await api.get(`/api/orcamentos/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orcamento-${id}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`PDF do orçamento #${id} gerado.`);
    } catch (e) {
      let mensagem = mensagemErro(e);
      if (e.response?.data instanceof Blob) {
        try {
          mensagem = JSON.parse(await e.response.data.text()).error;
        } catch {
          mensagem = "Não foi possível gerar o PDF.";
        }
      }
      toast.error(mensagem);
    } finally {
      setPdfBusy(false);
    }
  }

  function excluir() {
    if (!window.confirm("Excluir este orçamento e seus itens?")) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(`Orçamento #${id} excluído.`);
        navigate("/orcamentos");
      },
      onError: (erro) => toast.error(mensagemErro(erro)),
    });
  }

  const desconto = quote ? Number(quote.subtotal ?? quote.valor_total) - Number(quote.valor_total) : 0;

  return (
    <>
      <PageHeader
        title={`Orçamento #${id}`}
        subtitle={quote?.nome_cliente || "Sem cliente vinculado"}
        back="/orcamentos"
      />
      <Feedback error={queryError ? mensagemErro(queryError) : ""} />
      {isLoading ? (
        <p className="loading-line" role="status">
          <Spinner /> Carregando detalhes...
        </p>
      ) : quote ? (
        <section className="panel quote-detail">
          <dl className="detail-summary">
            <div>
              <dt>Status</dt>
              <dd>
                <StatusSelect
                  status={quote.status}
                  label={`Status do orçamento ${id}`}
                  disabled={ocupado}
                  onChange={alterarStatus}
                />
              </dd>
            </div>
            <div>
              <dt>Cliente</dt>
              <dd>{quote.nome_cliente || "Sem cliente vinculado"}</dd>
            </div>
            <div>
              <dt>Criação</dt>
              <dd>{dataBR(quote.data_criacao)}</dd>
            </div>
            <div>
              <dt>Validade</dt>
              <dd>{dataBR(quote.data_validade)}</dd>
            </div>
            <div>
              <dt>Prazo de entrega</dt>
              <dd>{dataBR(quote.prazo_entrega)}</dd>
            </div>
          </dl>
          <Table caption={`Itens do orçamento ${id}, quantidade e valores`}>
            <thead>
              <tr>
                <th scope="col">Material</th>
                <th scope="col" className="cell-number">Quantidade</th>
                <th scope="col" className="cell-number">Valor unitário</th>
                <th scope="col" className="cell-number">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {quote.itens.map((i) => (
                <tr key={i.id_item}>
                  <td>{i.tipo_produto}</td>
                  <td className="cell-number">{inteiro(i.quantidade)}</td>
                  <td className="cell-number">{moeda(i.valor_unitario)}</td>
                  <td className="cell-number">{moeda(i.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {quote.observacoes && (
            <p className="detail-notes">
              <strong>Observações</strong> {quote.observacoes}
            </p>
          )}
          <dl className="detail-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{moeda(quote.subtotal ?? quote.valor_total)}</dd>
            </div>
            <div>
              <dt>Desconto</dt>
              <dd>{desconto > 0 ? `− ${moeda(desconto)}` : moeda(0)}</dd>
            </div>
            <div className="detail-total">
              <dt>Total</dt>
              <dd>{moeda(quote.valor_total)}</dd>
            </div>
          </dl>
          <div className="detail-actions">
            <Link className="button button-neutral" to={`/orcamentos/${id}/editar`}>
              <Pencil size={18} aria-hidden="true" /> Editar
            </Link>
            <Button
              disabled={ocupado || !aprovado(quote.status)}
              title={aprovado(quote.status) ? undefined : "Aprove o orçamento para gerar o PDF"}
              onClick={pdf}
            >
              <FileDown size={18} aria-hidden="true" /> {pdfBusy ? "Gerando..." : "Gerar PDF"}
            </Button>
            {usuario.tipo === "admin" && (
              <Button variant="subtle" className="text-danger push-end" disabled={ocupado} onClick={excluir}>
                <Trash2 size={18} aria-hidden="true" /> {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            )}
          </div>
          {!aprovado(quote.status) && (
            <small className="hint">O PDF fica disponível quando o status é Aprovado ou Finalizado.</small>
          )}
        </section>
      ) : null}
    </>
  );
}
