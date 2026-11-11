import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Table } from "@/shared/components/ui";
import { StatusBadge } from "@/shared/components/domain";
import { dataBR, moeda } from "@/shared/utils/format.js";

export function DashboardTable({ recentes = [] }) {
  return (
    <section className="panel recent-quotes">
      <header>
        <h2>Últimos orçamentos</h2>
        <Link className="button button-subtle" to="/orcamentos">
          Ver todos <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>
      <Table
        caption="Últimos orçamentos, cliente, datas, status e valor"
        empty={!recentes.length}
        emptyMessage="Nenhum orçamento cadastrado."
      >
        <colgroup>
          {[9, 23, 16, 14, 16, 22].map((width, i) => (
            <col key={i} style={{ width: width + "%" }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Cliente</th>
            <th scope="col">Data de criação</th>
            <th scope="col">Validade</th>
            <th scope="col">Status</th>
            <th scope="col" className="cell-number">Valor</th>
          </tr>
        </thead>
        <tbody>
          {recentes.slice(0, 4).map((item) => (
            <tr key={item.id_orcamento}>
              <td>
                <Link to={"/status-orcamento/" + item.id_orcamento}>
                  #{item.id_orcamento}
                </Link>
              </td>
              <td>{item.nome_cliente || "Cliente não vinculado"}</td>
              <td>{dataBR(item.data_criacao)}</td>
              <td>{dataBR(item.data_validade)}</td>
              <td><StatusBadge status={item.status} /></td>
              <td className="cell-number">{moeda(item.valor_total)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
