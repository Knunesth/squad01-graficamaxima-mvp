import { useEffect, useState } from "react";
import { useMatch } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Calculator, Save } from "lucide-react";
import api, { mensagemErro } from "@/shared/services/api.js";
import { Button, Feedback, Modal, NumericInput } from "@/shared/components/ui";
import { useToast } from "@/shared/hooks/useToast.js";
import { decimal, moeda } from "@/shared/utils/format.js";

export default function CalculadoraM2({ aoFechar }) {
  const emEdicao = useMatch("/orcamentos/:id/editar");
  const noDetalhe = useMatch("/status-orcamento/:id");
  const id = emEdicao?.params.id || noDetalhe?.params.id;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tipos, setTipos] = useState([]);
  const [tipo, setTipo] = useState("");
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let ativo = true;
    api.get("/api/calculo/tipos")
      .then(({ data }) => {
        if (!ativo) return;
        setTipos(data.tipos || []);
        setTipo(data.tipos?.[0]?.tipo || "");
      })
      .catch((e) => { if (ativo) setErro(mensagemErro(e)); });
    return () => { ativo = false; };
  }, []);

  async function processarCalculo(event) {
    event.preventDefault();
    setErro("");
    setResultado(null);
    if (!tipo || !Number(largura) || !Number(altura) || !Number(quantidade)) {
      setErro("Preencha largura, altura e quantidade com valores maiores que zero.");
      return;
    }
    setOcupado(true);
    try {
      const rota = id ? "/api/calculo/metro-quadrado" : "/api/calculo/metro-quadrado/simulacao";
      const { data } = await api.post(rota, {
        tipo_servico: tipo, largura: Number(largura), altura: Number(altura),
        quantidade: Number(quantidade), id_orcamento: id ? Number(id) : null,
      });
      const calculo = data.calculo || data.resultado;
      if (!calculo) throw new Error("O servidor não retornou dados válidos.");
      setResultado(calculo);
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["orcamento", String(id)] });
        queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        toast.success(`Item adicionado ao orçamento #${id}.`);
      }
    } catch (e) {
      const mensagem = mensagemErro(e);
      setErro(mensagem);
      if (id) toast.error(mensagem);
    } finally {
      setOcupado(false);
    }
  }

  const area = resultado?.area_total_m2 ??
    (resultado?.dimensoes?.largura_m * resultado?.dimensoes?.altura_m * resultado?.quantidade);

  return (
    <Modal title={id ? `Adicionar item ao orçamento #${id}` : "Calculadora de m²"} onClose={aoFechar}>
      <div className="calculator-content">
        <Feedback error={erro} />
        <form onSubmit={processarCalculo} noValidate>
          <div className="field">
            <label htmlFor="calculator-service">Tipo de serviço</label>
            <select id="calculator-service" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {tipos.map((item) => <option key={item.tipo} value={item.tipo}>{item.tipo} · {moeda(item.preco_base_m2)}/m²</option>)}
            </select>
          </div>
          <div className="calculator-dimensions">
            <div className="field"><label htmlFor="calculator-width">Largura (m)</label>
              <NumericInput id="calculator-width" value={largura} onChange={setLargura} minDecimals={0} placeholder="0,00" required /></div>
            <div className="field"><label htmlFor="calculator-height">Altura (m)</label>
              <NumericInput id="calculator-height" value={altura} onChange={setAltura} minDecimals={0} placeholder="0,00" required /></div>
          </div>
          <div className="field"><label htmlFor="calculator-quantity">Quantidade</label>
            <NumericInput id="calculator-quantity" value={quantidade} onChange={setQuantidade} decimals={0} required /></div>
          <div className="form-actions">
            <Button type="submit" disabled={ocupado || !tipos.length}>
              {id ? <Save size={18} aria-hidden="true" /> : <Calculator size={18} aria-hidden="true" />}
              {id ? "Adicionar item" : "Simular valores"}
            </Button>
          </div>
        </form>
        {resultado && <div className="calculator-result" role="status" aria-live="polite">
          <dl><div><dt>Área total</dt><dd>{decimal(area)} m²</dd></div>
            <div><dt>Valor unitário</dt><dd>{moeda(resultado.valor_unitario)}</dd></div>
            <div><dt>Valor total</dt><dd>{moeda(resultado.valor_total)}</dd></div></dl>
        </div>}
      </div>
    </Modal>
  );
}
