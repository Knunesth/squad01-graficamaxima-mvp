import React, { useState, useEffect } from "react";

import api from "../../services/api.js";
import { useParams } from "react-router-dom";

const CalculadoraM2 = ({ aoFechar }) => {
  const { id } = useParams();

  const [tiposDisponiveis, setTiposDisponiveis] = useState([]);
  const [tipoServico, setTipoServico] = useState("");
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [quantidade, setQuantidade] = useState("1");

  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api
      .get("/api/calculo/tipos")
      .then((res) => {
        if (res.data && res.data.tipos) {
          setTiposDisponiveis(res.data.tipos);
          if (res.data.tipos.length > 0) {
            setTipoServico(res.data.tipos[0].tipo || "");
          }
        }
      })
      .catch((err) => {
        console.error("Erro ao listar tipos de serviços:", err);
        setErro("Não foi possível carregar os tipos de serviços.");
      });
  }, []);

  const processarCalculo = async (e) => {
    e.preventDefault();
    setErro("");
    setResultado(null);

    const numLargura = Number(largura);
    const numAltura = Number(altura);
    const numQuantidade = Number(quantidade);

    if (!tipoServico || !numLargura || !numAltura || !numQuantidade) {
      setErro(
        "Preencha largura, altura e quantidade com valores maiores que zero.",
      );
      return;
    }

    const payload = {
      tipo_servico: tipoServico,
      largura: numLargura,
      altura: numAltura,
      quantidade: numQuantidade,
      id_orcamento: id ? parseInt(id) : null,
    };

    const urlFinal = id
      ? "/api/calculo/metro-quadrado"
      : "/api/calculo/metro-quadrado/simulacao";

    try {
      const response = await api.post(urlFinal, payload);
      const dadosCalculados = response.data.calculo || response.data.resultado;

      if (dadosCalculados) {
        setResultado(dadosCalculados);
        if (id) {
          alert("Item calculado e inserido no orçamento com sucesso!");
        }
      } else {
        setErro("O servidor não retornou dados válidos.");
      }
    } catch (err) {
      console.error("Erro ao processar cálculo no back:", err);
      setErro(
        err.response?.data?.error ||
          "Falha no servidor ao processar o cálculo.",
      );
    }
  };

  // 🚀 FUNÇÃO MÁGICA: Formata números decimais e áreas grandes para o padrão de leitura PT-BR
  const formatarNumeroBR = (valor, ehMoeda = false) => {
    if (ehMoeda) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(valor);
    }
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  };

  return (
    /* 🚀 RETAQUE DE SEGURANÇA: Removido o onClick de fechar do fundo para evitar que o modal suma sozinho com bugs de clique */
    <div className="modal-overlay">
      <div className="modal-calculadora">
        {/* 🚀 BOTÃO DE FECHAR BLINDADO: Agora o fechamento é exclusivo por aqui! */}
        <button
          className="btn-fechar-modal"
          onClick={aoFechar}
          title="Fechar Calculadora"
        >
          ×
        </button>

        <h3>
          {id ? `Vincular Item ao Orçamento #${id}` : "Calculadora de M²"}
        </h3>
        <hr style={{ borderColor: "#34495e", margin: "10px 0" }} />

        {erro && (
          <div
            style={{ color: "#e74c3c", fontSize: "13px", marginBottom: "10px" }}
          >
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={processarCalculo}>
          <label>Tipo de Serviço / Produto:</label>
          <select
            value={tipoServico}
            onChange={(e) => setTipoServico(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              background: "#34495e",
              color: "white",
              borderRadius: "4px",
              border: "1px solid #2c3e50",
              textTransform: "uppercase",
            }}
          >
            {tiposDisponiveis.map((item, idx) => (
              <option key={idx} value={item.tipo}>
                {item.tipo.toUpperCase()} - (
                {formatarNumeroBR(item.preco_base_m2, true)}/m²)
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <div>
              <label>Largura (m):</label>
              <input
                type="number"
                step="0.01"
                value={largura}
                onChange={(e) => setLargura(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label>Altura (m):</label>
              <input
                type="number"
                step="0.01"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <label>Quantidade:</label>
          <input
            type="number"
            min="1"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />

          <button
            type="submit"
            className="btn-finalizar"
            style={{ width: "100%", marginTop: "15px" }}
          >
            {id ? "Calcular & Salvar Item" : "Simular Valores"}
          </button>
        </form>

        {/* 🚀 EXIBIÇÃO FORMATADA DE ALTA LEGIBILIDADE */}
        {resultado && (
          <div
            style={{
              marginTop: "15px",
              background: "#27ae60",
              padding: "12px",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            <p style={{ margin: "3px 0" }}>
              📐 Total Área:{" "}
              <strong>
                {formatarNumeroBR(
                  resultado.area_total_m2 ||
                    resultado.dimensoes?.largura_m *
                      resultado.dimensoes?.altura_m *
                      resultado.quantidade,
                )}{" "}
                m²
              </strong>
            </p>
            <p style={{ margin: "3px 0" }}>
              💵 Vl. Unitário:{" "}
              <strong>
                {formatarNumeroBR(resultado.valor_unitario || 0, true)}
              </strong>
            </p>
            <p
              style={{
                margin: "5px 0 0 0",
                borderTop: "1px solid #2ecc71",
                paddingTop: "5px",
                fontSize: "15px",
              }}
            >
              💰 Valor Total:{" "}
              <strong>
                {formatarNumeroBR(resultado.valor_total || 0, true)}
              </strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalculadoraM2;
