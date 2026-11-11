import { useState, useEffect } from "react";
import api from "@/shared/services/api.js";

export default function NovoOrcamentoModal() {
  const [acabamentosCatalogo, setAcabamentosCatalogo] = useState([]);

  const [acabamentosSelecionados, setAcabamentosSelecionados] = useState([]);

  const [quantidade, setQuantidade] = useState(1);
  const custoPapel = 10.0;
  const valorTotalOrcamento =
    custoPapel +
    acabamentosSelecionados.reduce(
      (total, item) =>
        total +
        Number(item.custoUnitario || 0) * quantidade +
        Number(item.custoFixo || 0),
      0,
    );

  useEffect(() => {
    async function carregarAcabamentos() {
      try {
        const response = await api.get("/configuracoes/Geral");
        setAcabamentosCatalogo(response.data);
      } catch (error) {
        console.error("Erro ao buscar acabamentos para o orçamento:", error);
      }
    }
    carregarAcabamentos();
  }, []);

  function handleCheckboxChange(item) {
    const jaSelecionado = acabamentosSelecionados.find((a) => a.id === item.id);

    if (jaSelecionado) {
      setAcabamentosSelecionados(
        acabamentosSelecionados.filter((a) => a.id !== item.id),
      );
    } else {
      setAcabamentosSelecionados([...acabamentosSelecionados, item]);
    }
  }

  return (
    <div className="modal-orcamento">
      <h2>Montando Orçamento (Comanda)</h2>

      <div className="input-grupo">
        <label>Quantidade de Exemplares:</label>
        <input
          type="number"
          value={quantidade}
          onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
        />
      </div>

      <div className="secao-acabamentos">
        <h3>Selecione os Acabamentos Adicionais:</h3>

        {acabamentosCatalogo.map((item) => (
          <div key={item.id} className="checkbox-item">
            <label>
              <input
                type="checkbox"
                checked={
                  !!acabamentosSelecionados.find((a) => a.id === item.id)
                }
                onChange={() => handleCheckboxChange(item)}
              />
              <strong>{item.subCategoria}</strong> - {item.tamFolha}
              <span className="preco-tag">
                {" "}
                (+ R$ {Number(item.custoUnitario).toFixed(2)}/un)
              </span>
            </label>
          </div>
        ))}
      </div>

      <hr />
      <div className="total-box">
        <h3>Valor Total Estimado: R$ {valorTotalOrcamento.toFixed(2)}</h3>
      </div>
    </div>
  );
}
