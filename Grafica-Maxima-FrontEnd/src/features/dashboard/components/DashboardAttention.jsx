import { Link } from "react-router-dom";
import { ArrowRight, Clock3 } from "lucide-react";
import { dataBR, moeda } from "@/shared/utils/format.js";

export function DashboardAttention({ itens = [] }) {
  return (
    <section className="panel dashboard-attention">
      <div className="dashboard-section-heading"><h2>Precisam de atenção</h2><Clock3 size={20} aria-hidden="true" /></div>
      {itens.length ? (
        <ul>
          {itens.map((item) => (
            <li key={item.id_orcamento}>
              <Link to={`/status-orcamento/${item.id_orcamento}`}>
                <span><strong>#{item.id_orcamento} · {item.nome_cliente || "Cliente não vinculado"}</strong>
                  <small>{item.motivo === "validade" ? `Validade: ${dataBR(item.data_validade)}` : `Em negociação desde ${dataBR(item.data_criacao)}`}</small>
                </span>
                <span>{moeda(item.valor_total)} <ArrowRight size={16} aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p>Está tudo em dia. Nenhum orçamento precisa de atenção agora.</p>}
    </section>
  );
}
