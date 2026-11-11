import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowDownRight, ArrowUpRight, Printer, RefreshCw } from "lucide-react";
import api, { mensagemErro } from "@/shared/services/api.js";
import { Button, Spinner } from "@/shared/components/ui";
import "../reports.css";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function localDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function deltaDescription(change, percentagePoints = false) {
  if (percentagePoints) {
    const value = change?.percentagePoints || 0;
    if (!value) return "Sem variação em relação ao período anterior";
    return `${value > 0 ? "+" : "−"}${number.format(Math.abs(value))} p.p. em relação ao período anterior`;
  }
  if (change?.percent == null) return "Sem base no período anterior";
  if (change.percent === 0) return "Sem variação em relação ao período anterior";
  return `${change.percent > 0 ? "+" : "−"}${number.format(Math.abs(change.percent))}% em relação ao período anterior`;
}

function Delta({ change, percentagePoints = false }) {
  const value = percentagePoints ? change?.percentagePoints : change?.percent;
  const Icon = value < 0 ? ArrowDownRight : ArrowUpRight;
  const state = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
  return (
    <span className={`report-delta ${state}`}>
      {value ? <Icon size={15} aria-hidden="true" /> : null}
      {deltaDescription(change, percentagePoints)}
    </span>
  );
}

function MetricCard({ label, value, change, secondary, percentagePoints }) {
  return (
    <article className="report-metric panel">
      <p className="report-metric-label">{label}</p>
      <strong className="report-metric-value">{value}</strong>
      {secondary ? <span className="report-metric-secondary">{secondary}</span> : null}
      <Delta change={change} percentagePoints={percentagePoints} />
    </article>
  );
}

function RevenueChart({ reports }) {
  const values = reports.slice(0, 12).reverse();
  const max = Math.max(...values.map((report) => report.dados.metrics.revenue), 1);
  const points = values.map((report, index) => {
    const x = values.length < 2 ? 300 : 20 + (index * 560) / (values.length - 1);
    const y = 142 - (report.dados.metrics.revenue / max) * 118;
    return { x, y, report };
  });
  const path = points.map(({ x, y }, index) => `${index ? "L" : "M"}${x},${y}`).join(" ");

  if (!reports.length) {
    return <p className="report-empty">Gere o primeiro relatório para iniciar a tendência.</p>;
  }

  return (
    <div className="report-chart-wrap">
      <svg
        className="report-chart"
        viewBox="0 0 600 170"
        role="img"
        aria-label={`Tendência de receita em ${values.length} relatórios ${values[0]?.tipo === "weekly" ? "semanais" : "mensais"}`}
      >
        <line x1="20" y1="142" x2="580" y2="142" className="report-chart-axis" />
        <line x1="20" y1="83" x2="580" y2="83" className="report-chart-grid" />
        <line x1="20" y1="24" x2="580" y2="24" className="report-chart-grid" />
        {points.length > 1 ? <path d={path} className="report-chart-line" /> : null}
        {points.map(({ x, y, report }) => (
          <circle key={report.id_relatorio} cx={x} cy={y} r="5" className="report-chart-point">
            <title>{`${formatDate(report.data_inicio)} · ${brl.format(report.dados.metrics.revenue)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="report-chart-labels" aria-hidden="true">
        <span>{formatDate(values[0].data_inicio)}</span>
        <span>{formatDate(values.at(-1).data_inicio)}</span>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [type, setType] = useState("weekly");
  const [date, setDate] = useState(localDate);
  const queryClient = useQueryClient();
  const queryKey = ["reports", type, date];
  const reportsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const current = await api.get("/api/reports", { params: { type, date } });
      const history = await api.get("/api/reports/history", { params: { type, limit: 12 } });
      return { current: current.data, history: history.data.itens };
    },
  });
  const refresh = useMutation({
    mutationFn: async () => {
      const response = await api.post("/api/reports/generate", { type, date });
      return response.data;
    },
    onSuccess: async (current) => {
      await queryClient.invalidateQueries({ queryKey: ["reports", type] });
      queryClient.setQueryData(queryKey, (old) => ({ ...old, current }));
    },
  });
  const report = reportsQuery.data?.current;
  const history = reportsQuery.data?.history || [];
  const chartData = history;

  function abrirImpressao() {
    window.print();
  }

  return (
    <section className="reports-page" aria-labelledby="reports-title">
      <header className="page-header report-page-header">
        <div>
          <h1 id="reports-title">Relatórios</h1>
          <p>Visão de vendas, conversão e produção da Gráfica Máxima.</p>
        </div>
        <Button variant="neutral" onClick={abrirImpressao} disabled={!report}>
          <Printer size={17} aria-hidden="true" /> Imprimir / salvar PDF
        </Button>
      </header>

      <div className="report-controls panel">
        <label className="field">
          <span>Período</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
        </label>
        <label className="field">
          <span>Data de referência</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <Button
          variant="primary"
          onClick={() => refresh.mutate()}
          disabled={reportsQuery.isLoading || refresh.isPending}
        >
          <RefreshCw size={16} aria-hidden="true" />
          {refresh.isPending ? "Atualizando…" : "Atualizar relatório"}
        </Button>
      </div>

      {reportsQuery.isLoading ? (
        <div className="report-state" role="status"><Spinner /> Carregando relatório…</div>
      ) : reportsQuery.isError ? (
        <div className="report-state report-state-error" role="alert">
          <AlertCircle size={20} aria-hidden="true" />
          <span>{mensagemErro(reportsQuery.error)}</span>
          <Button variant="neutral" onClick={() => reportsQuery.refetch()}>Tentar novamente</Button>
        </div>
      ) : report ? (
        <>
          <div className="report-period-heading">
            <div>
              <span className="report-eyebrow">{type === "weekly" ? "Resumo semanal" : "Resumo mensal"}</span>
              <h2>{formatDate(report.data_inicio)} a {formatDate(report.data_fim)}</h2>
            </div>
            <span className="report-period-note">Comparado ao período anterior</span>
          </div>

          <div className="report-metrics-grid">
            <MetricCard
              label="Orçamentos criados"
              value={number.format(report.dados.metrics.quotesCreated)}
              change={report.dados.changes.quotesCreated}
            />
            <MetricCard
              label="Conversão"
              value={`${number.format(report.dados.metrics.conversionRate)}%`}
              change={report.dados.changes.conversionRate}
              percentagePoints
            />
            <MetricCard
              label="Vendas finalizadas"
              value={number.format(report.dados.metrics.finalizedSales)}
              change={report.dados.changes.finalizedSales}
            />
            <MetricCard
              label="Receita de vendas"
              value={brl.format(report.dados.metrics.revenue)}
              change={report.dados.changes.revenue}
            />
            <MetricCard
              label="Aprovados / em produção"
              value={`${number.format(report.dados.metrics.approvedProduction.count)} orçamento(s)`}
              secondary={brl.format(report.dados.metrics.approvedProduction.value)}
              change={report.dados.changes.approvedProduction.count}
            />
            <MetricCard
              label="Ticket médio finalizado"
              value={brl.format(report.dados.metrics.averageTicket)}
              change={report.dados.changes.averageTicket}
            />
          </div>

          <section className="report-summary panel" aria-labelledby="report-summary-title">
            <h2 id="report-summary-title">Resumo do período</h2>
            <p>{report.resumo}</p>
          </section>

          <div className="report-lower-grid">
            <section className="report-panel panel" aria-labelledby="report-trend-title">
              <div className="report-panel-heading">
                <div>
                  <h2 id="report-trend-title">Tendência de receita</h2>
                  <p>Vendas registradas em relatórios anteriores.</p>
                </div>
              </div>
              <RevenueChart reports={chartData} />
            </section>

            <section className="report-panel panel" aria-labelledby="report-products-title">
              <div className="report-panel-heading">
                <div>
                  <h2 id="report-products-title">Produtos mais vendidos</h2>
                  <p>Itens dos orçamentos finalizados no período.</p>
                </div>
              </div>
              {report.dados.metrics.topProducts.length ? (
                <ol className="report-products-list">
                  {report.dados.metrics.topProducts.map((product) => (
                    <li key={product.product}>
                      <span><strong>{product.product}</strong><small>{number.format(product.quantity)} unidades</small></span>
                      <b>{brl.format(product.value)}</b>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="report-empty">Nenhuma venda finalizada neste período.</p>
              )}
            </section>
          </div>

          <section className="report-panel panel" aria-labelledby="report-history-title">
            <div className="report-panel-heading">
              <div>
                <h2 id="report-history-title">Histórico de relatórios</h2>
                <p>Selecione um período para consultar o resumo salvo.</p>
              </div>
            </div>
            {history.length ? (
              <div className="report-history-list">
                {history.map((item) => (
                  <button
                    className="report-history-item"
                    type="button"
                    key={item.id_relatorio}
                    onClick={() => setDate(item.data_inicio)}
                    aria-label={`Abrir relatório de ${formatDate(item.data_inicio)} a ${formatDate(item.data_fim)}`}
                  >
                    <span><strong>{formatDate(item.data_inicio)} a {formatDate(item.data_fim)}</strong><small>{item.tipo === "weekly" ? "Semanal" : "Mensal"}</small></span>
                    <span>{brl.format(item.dados.metrics.revenue)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="report-empty">Nenhum relatório salvo para este filtro.</p>
            )}
          </section>
        </>
      ) : (
        <div className="report-state">Nenhum dado disponível para este período.</div>
      )}
    </section>
  );
}
