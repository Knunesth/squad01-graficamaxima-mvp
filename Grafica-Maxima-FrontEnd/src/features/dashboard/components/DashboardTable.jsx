import { Link } from "react-router-dom";
import { Table } from "../../../components/ui";
import { dataBR, moeda } from "../../../lib/format";

export function DashboardTable({ recentes = [] }) {
  return (
    <section className="panel recent-quotes">
      <header>
        <h2>Últimos orçamentos</h2>
        <Link className="button button-subtle" to="/orcamentos">
          Ver todos
        </Link>
      </header>
      <Table
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
            <th>ID</th>
            <th>Cliente</th>
            <th>Data de criação</th>
            <th>Validade</th>
            <th>Status</th>
            <th>Valor</th>
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
              <td>{item.status || "Não aprovado"}</td>
              <td>{moeda(item.valor_total)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
