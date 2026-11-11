import React, { useState, useEffect, useRef } from "react";

import { useMatch } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/shared/services/api.js";
import { useToast } from "@/shared/hooks/useToast.js";

const CalculadoraM2 = ({ aoFechar }) => {
  // A calculadora fica fora das <Routes>, então useParams() não enxerga o
  // :id. O orçamento aberto (em edição ou no detalhe) é lido do endereço.
  const emEdicao = useMatch("/orcamentos/:id/editar");
  const noDetalhe = useMatch("/status-orcamento/:id");
  const id = emEdicao?.params.id || noDetalhe?.params.id;
  const queryClient = useQueryClient();
  const toast = useToast();
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

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
          // O orçamento mudou no servidor (novo item, totais e versão):
          // recarrega as telas que o exibem.
          queryClient.invalidateQueries({ queryKey: ["orcamento", String(id)] });
          queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          toast.success(`Item adicionado ao orçamento #${id}.`);
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
    <dialog ref={dialogRef} className="calculator-dialog" aria-labelledby="calculator-title" onCancel={(event) => { event.preventDefault(); aoFechar(); }}>
      <div className="modal-calculadora">
        <button
          className="btn-fechar-modal"
          type="button"
          onClick={aoFechar}
          title="Fechar Calculadora"
          aria-label="Fechar calculadora"
        >
          ×
        </button>

        <h2 id="calculator-title">
          {id ? `Vincular Item ao Orçamento #${id}` : "Calculadora de M²"}
        </h2>
        <hr style={{ borderColor: "#34495e", margin: "10px 0" }} />

        {erro && (
          <div
            className="calculator-error"
            role="alert"
          >
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={processarCalculo}>
          <label htmlFor="calculator-service">Tipo de Serviço / Produto:</label>
          <select
            id="calculator-service"
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
              <label htmlFor="calculator-width">Largura (m):</label>
              <input
                id="calculator-width"
                type="number"
                step="0.01"
                inputMode="decimal"
                autoComplete="off"
                value={largura}
                onChange={(e) => setLargura(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="calculator-height">Altura (m):</label>
              <input
                id="calculator-height"
                type="number"
                step="0.01"
                inputMode="decimal"
                autoComplete="off"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <label htmlFor="calculator-quantity">Quantidade:</label>
          <input
            id="calculator-quantity"
            type="number"
            min="1"
            inputMode="numeric"
            autoComplete="off"
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

        {resultado && (
          <div className="calculator-result" role="status" aria-live="polite">
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
    </dialog>
  );
};

export default CalculadoraM2;
