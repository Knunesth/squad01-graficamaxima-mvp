import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { StatusBadge, STATUS_OPCOES } from "@/shared/components/domain";
import { inteiro, moeda } from "@/shared/utils/format.js";

function Comparacao({ atual, anterior, nota }) {
  if (!anterior) return null;
  const variacao = ((atual - anterior) / anterior) * 100;
  const Icone = variacao >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <small className="dashboard-comparison">
      <Icone size={16} aria-hidden="true" />
      {Math.abs(variacao).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% em relação ao mês anterior
      {nota && <span>{nota}</span>}
    </small>
  );
}

function Evolucao({ semanas = [] }) {
  const maior = Math.max(0, ...semanas.flatMap((s) => [Number(s.valor) || 0, Number(s.valorAprovado) || 0]));
  const teto = Math.max(1, Math.ceil(maior / 100) * 100);
  const y = (valor) => 230 - (Number(valor || 0) / teto) * 190;
  const descricao = semanas.map((s) => `semana ${s.semana}: orçado ${moeda(s.valor)}, aprovado ${moeda(s.valorAprovado)}`).join("; ");
  return (
    <section className="panel dashboard-evolution" aria-label="Evolução do mês">
      <div className="dashboard-section-heading">
        <h2>Evolução do mês</h2>
        <div className="dashboard-legend"><span>Orçado</span><span>Aprovado</span></div>
      </div>
      <div className="dashboard-chart-scroll">
        <svg viewBox="0 0 680 285" role="img" aria-label={`Valores por semana: ${descricao}`}>
          <title>Valor orçado e aprovado por semana</title>
          {[0, 0.5, 1].map((fracao) => (
            <g key={fracao}>
              <line className="chart-gridline" x1="108" x2="662" y1={y(teto * fracao)} y2={y(teto * fracao)} />
              <text className="chart-axis" x="100" y={y(teto * fracao) + 4} textAnchor="end">{moeda(teto * fracao)}</text>
            </g>
          ))}
          {semanas.map((semana, index) => {
            const x = 132 + index * 108;
            return (
              <g key={semana.semana}>
                <rect className="chart-budgeted" x={x} y={y(semana.valor)} width="30" height={230 - y(semana.valor)} rx="3" />
                <rect className="chart-approved" x={x + 34} y={y(semana.valorAprovado)} width="30" height={230 - y(semana.valorAprovado)} rx="3" />
                <text className="chart-axis" x={x + 32} y="254" textAnchor="middle">Sem. {semana.semana}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

export function DashboardKPIs({ dados, semGrafico = false }) {
  const atual = dados.totais || {};
  const anterior = dados.anterior || {};
  const taxa = atual.novos ? (atual.aprovados / atual.novos) * 100 : 0;
  const taxaAnterior = anterior.novos ? (anterior.aprovados / anterior.novos) * 100 : 0;
  const cards = [
    { titulo: "Valor em aberto", valor: moeda(dados.valorAtivo), detalhe: `${inteiro(dados.ativos)} orçamentos de todos os meses`, comparacao: [atual.valorAbertosCriados, anterior.valorAbertosCriados], nota: "Abertos criados em cada mês" },
    { titulo: "Aprovado no mês", valor: moeda(dados.valorAprovados), detalhe: `${inteiro(dados.aprovados)} orçamentos aprovados`, comparacao: [dados.valorAprovados, anterior.valorAprovados] },
    { titulo: "Vendas finalizadas", valor: moeda(atual.valorFinalizados), detalhe: `${inteiro(atual.finalizados)} vendas no mês`, comparacao: [atual.valorFinalizados, anterior.valorFinalizados] },
    { titulo: "Taxa de aprovação", valor: `${taxa.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, detalhe: `${inteiro(dados.aprovados)} de ${inteiro(dados.novos)} orçamentos criados`, comparacao: [taxa, taxaAnterior] },
  ];
  return (
    <>
      <section className="dashboard-metrics" aria-label="Indicadores dos orçamentos">
        {cards.map((card) => (
          <article className="panel dashboard-metric" key={card.titulo}>
            <h2>{card.titulo}</h2><strong>{card.valor}</strong><small>{card.detalhe}</small>
            <Comparacao atual={card.comparacao[0]} anterior={card.comparacao[1]} nota={card.nota} />
          </article>
        ))}
      </section>
      {!semGrafico && <Evolucao semanas={dados.semanas} />}
      <ul className="panel status-strip" aria-label="Orçamentos por status">
        {STATUS_OPCOES.map((status) => {
          const item = dados.statusCounts?.[status] || { count: 0, valor: 0 };
          return (
            <li key={status}><Link to={`/orcamentos?status=${encodeURIComponent(status)}`} aria-label={`${status}: ${inteiro(item.count)} orçamentos`}>
              <StatusBadge status={status} /><strong>{inteiro(item.count)}</strong><small>{moeda(item.valor)}</small>
            </Link></li>
          );
        })}
      </ul>
    </>
  );
}
