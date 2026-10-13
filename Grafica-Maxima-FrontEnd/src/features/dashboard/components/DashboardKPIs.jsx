import { moeda } from "../../../lib/format";

// Dynamic data uses the wireframe's 314 × 128 chart geometry.
function WeeklyChart({ series = [], type = "bar", label }) {
  const values = series.map((item) => Math.max(0, Number(item.valor) || 0));
  const max = Math.max(...values, 1);
  const step = max > 10 ? 10 : 2;
  const ceiling = (Math.floor(max / step) + 1) * step;
  const x = (index) =>
    values.length <= 1 ? 169 : 53 + (index * 231) / (values.length - 1);
  const y = (value) => 90 - (value / ceiling) * 80;
  return (
    <svg
      className="mini-chart"
      viewBox="0 0 314 128"
      role="img"
      aria-label={label}
    >
      <title>
        {label}:{" "}
        {series
          .map((item, i) => "semana " + item.semana + ": " + values[i])
          .join(", ") || "sem dados"}
      </title>
      {[ceiling, ceiling / 2, 0].map((value) => (
        <g key={value}>
          <line x1="32" x2="304" y1={y(value)} y2={y(value)} stroke="#e5e5e5" />
          <text x="0" y={y(value) + 4} fill="#696969" fontSize="10">
            {value.toLocaleString("pt-BR")}
          </text>
        </g>
      ))}
      {type === "line" && values.length > 0 && (
        <polyline
          points={values.map((v, i) => x(i) + "," + y(v)).join(" ")}
          fill="none"
          stroke="#333"
          strokeWidth="3"
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
                rx="2"
                fill={index === values.length - 1 ? "#333" : "#999"}
              />
              <text
                x={x(index)}
                y={y(values[index]) - 7}
                textAnchor="middle"
                fill="#333"
                fontSize="10"
              >
                {values[index]}
              </text>
            </>
          )}
          <text
            x={x(index)}
            y="117"
            textAnchor="middle"
            fill="#696969"
            fontSize="10"
          >
            Sem. {item.semana}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DashboardKPIs({ dados }) {
  const series = (key, divisor = 1) =>
    (dados.semanas || []).map((item) => ({
      semana: item.semana,
      valor: item[key] / divisor,
    }));
  const percent = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(dados.novos ? (dados.aprovados / dados.novos) * 100 : 0);
  const cards = [
    {
      title: "Orçamentos ativos",
      value: moeda(dados.valorAtivo),
      description: dados.ativos + " orçamentos · valor total ativo",
      chart: series("ativos", 1000),
      type: "line",
      caption: "Evolução do valor ativo · R$ mil",
    },
    {
      title: "Novos orçamentos",
      value: dados.novos,
      description: "Orçamentos criados neste mês",
      chart: series("novos"),
      caption: "Quantidade por semana",
    },
    {
      title: "Orçamentos aprovados",
      value: dados.aprovados,
      description: percent + "% dos " + dados.novos + " novos orçamentos",
      chart: series("aprovados"),
      caption: "Quantidade aprovada por semana",
    },
  ];
  return (
    <section className="metric-grid" aria-label="Indicadores dos orçamentos">
      {cards.map((card) => (
        <article className="panel metric-card" key={card.title}>
          <h2>{card.title}</h2>
          <strong>{card.value}</strong>
          <small>{card.description}</small>
          <WeeklyChart
            series={card.chart}
            type={card.type}
            label={card.caption}
          />
          <small>{card.caption}</small>
        </article>
      ))}
    </section>
  );
}
