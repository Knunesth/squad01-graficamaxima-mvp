import { Key } from "lucide-react";
import { useNavigate } from "react-router-dom";

function UltimosOrcamentos({ orcamentos = [], deletarOrcamento, prepararEdicaoOrcamento }) {
  const navegacao = useNavigate();

  function irParaStatusOrçamento(id) {
    navegacao(`/status-orcamento/${id}`, {
      state: { abrirModal: true },
    });
  }

  const lista = Array.isArray(orcamentos) ? orcamentos : [];

  return (
    <div className="fundoUtimosO">
      <h2>Últimos Orçamentos</h2>
      <p>Acompanhe os pedidos mais recentes em andamento.</p>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Entrega</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {lista.map((item) => {
            const idReal = item.id_orcamento || item.id;

            return (
              <tr key={idReal} onClick={() => irParaStatusOrçamento(idReal)}>
                {/* ID */}
                <td>{idReal}</td>
                
                {/* Nome */}
                <td>{item.nome_cliente || item.nome || item.cliente || `Cliente #${item.id_cliente}`}</td>
                
                {/* Produto */}
                <td>{item.produto || item.observacoes || "Impressão"}</td>
                
                {/* Quantidade */}
                <td>{item.quantidade || item.valor_unitario || 1}</td>
                
                {/* Entrega */}
                <td>
                  {item.entrega || (item.prazo_entrega && item.prazo_entrega.includes("T")
                    ? new Date(item.prazo_entrega).toLocaleDateString("pt-BR")
                    : item.prazo_entrega || "A combinar")}
                </td>
                
                {/* Valor */}
                <td>
                  {item.valor 
                    ? `R$${item.valor}` 
                    : (Number(item.valor_total) || 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                </td>
                
                {/* Status */}
                <td>{item.status}</td>

                <td>
                  <div className="botoes-acoes" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      className="btn-editar" 
                      onClick={(e) => {
                        e.stopPropagation();
                        prepararEdicaoOrcamento(item);
                      }}
                      title="Editar Orçamento"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                    >
                      ✏️
                    </button>
                    
                    <button 
                      className="btn-deletar" 
                      onClick={(e) => {
                        e.stopPropagation();
                        deletarOrcamento(idReal);
                      }}
                      title="Excluir Orçamento"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default UltimosOrcamentos;
