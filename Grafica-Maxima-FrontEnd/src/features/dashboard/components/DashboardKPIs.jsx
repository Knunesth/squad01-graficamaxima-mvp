import { StatusBadge, STATUS_OPCOES } from "@/shared/components/domain";
import { inteiro, moeda } from "@/shared/utils/format.js";

const compacto = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const moedaCurta = (valor) => `R$ ${compacto.format(valor)}`;

/** Menor teto "redondo" (1, 2, 5 ou 10 × potência de 10) acima do maior valor. */
function tetoRedondo(maximo, contagem) {
  if (maximo <= 0) return contagem ? 4 : 100;
  const base = 10 ** Math.floor(Math.log10(maximo));
  const passos = contagem ? [2, 4, 10] : [1, 2, 5, 10];
  const teto = passos.map((p) => p * base).find((p) => p >= maximo);
  return contagem ? Math.max(4, teto) : teto;
}

// Geometria do gráfico: 314 × 128, igual à dos wireframes.
function WeeklyChart({ series = [], type = "bar", label, dinheiro = false }) {
  const values = series.map((item) => Math.max(0, Number(item.valor) || 0));
  const ceiling = tetoRedondo(Math.max(...values, 0), !dinheiro);
  const formatar = dinheiro ? moedaCurta : inteiro;
  const x = (index) =>
    values.length <= 1 ? 174 : 64 + (index * 226) / (values.length - 1);
  const y = (value) => 90 - (value / ceiling) * 76;
  return (
    <svg className="mini-chart" viewBox="0 0 314 128" role="img" aria-label={label}>
      <title>
        {label}:{" "}
        {series.map((item, i) => `semana ${item.semana}: ${formatar(values[i])}`).join(", ") ||
          "sem dados"}
      </title>
      {[ceiling, ceiling / 2, 0].map((value) => (
        <g key={value}>
          <line x1="44" x2="304" y1={y(value)} y2={y(value)} stroke="#e8e9f1" />
          <text x="38" y={y(value) + 4} textAnchor="end" fill="#696d84" fontSize="10">
            {formatar(value)}
          </text>
        </g>
      ))}
      {type === "line" && values.length > 0 && (
        <polyline
          points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
          fill="none"
          stroke="#333"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {series.map((item, index) => (
        <g key={item.semana}>
          {type === "line" ? (
            <circle cx={x(index)} cy={y(values[index])} r="4" fill="#333" />
          ) : (
            <>
              <rect
                x={x(index) - 16}
                y={y(values[index])}
                width="32"
                height={90 - y(values[index])}
                rx="3"
              />
              {values[index] > 0 && (
                <text x={x(index)} y={y(values[index]) - 6} textAnchor="middle" fill="#20234f" fontSize="10" fontWeight="600">
                  {formatar(values[index])}
                </text>
              )}
            </>
          )}
          <text x={x(index)} y="112" textAnchor="middle" fill="#696d84" fontSize="10">
            Sem. {item.semana}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DashboardKPIs({ dados }) {
  const series = (key) =>
    (dados.semanas || []).map((item) => ({ semana: item.semana, valor: item[key] }));
  const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
    dados.novos ? (dados.aprovados / dados.novos) * 100 : 0,
  );
  const plural = (n, um, varios) => `${inteiro(n)} ${n === 1 ? um : varios}`;
  const cards = [
    {
      title: "Em andamento",
      value: moeda(dados.valorAtivo),
      description: `${plural(dados.ativos, "orçamento aberto", "orçamentos abertos")}, de qualquer mês`,
      chart: series("valor"),
      type: "line",
      dinheiro: true,
      caption: "Valor orçado por semana, neste mês",
    },
    {
      title: "Novos no mês",
      value: inteiro(dados.novos),
      description: `${moeda(dados.valorNovos)} em orçamentos criados`,
      chart: series("novos"),
      caption: "Orçamentos criados por semana",
    },
    {
      title: "Aprovados no mês",
      value: inteiro(dados.aprovados),
      description: `${percent}% dos novos · ${moeda(dados.valorAprovados)}`,
      chart: series("aprovados"),
      caption: "Orçamentos aprovados por semana",
    },
  ];
  const porStatus = STATUS_OPCOES.map((status) => ({
    status,
    ...(dados.statusCounts?.[status] || { count: 0, valor: 0 }),
  }));

  return (
    <>
      <section className="metric-grid" aria-label="Indicadores dos orçamentos">
        {cards.map((card) => (
          <article className="panel metric-card" key={card.title}>
            <h2>{card.title}</h2>
            <strong>{card.value}</strong>
            <small>{card.description}</small>
            <WeeklyChart series={card.chart} type={card.type} label={card.caption} dinheiro={card.dinheiro} />
            <small>{card.caption}</small>
          </article>
        ))}
      </section>
      <ul className="panel status-strip" aria-label="Orçamentos por status">
        {porStatus.map((item) => (
          <li key={item.status}>
            <StatusBadge status={item.status} />
            <strong>{inteiro(item.count)}</strong>
            <small>{moeda(item.valor)}</small>
          </li>
        ))}
      </ul>
    </>
  );
}
