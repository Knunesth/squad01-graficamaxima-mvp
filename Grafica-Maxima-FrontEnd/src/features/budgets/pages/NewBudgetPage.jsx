import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  Check,
  Plus,
  Save,
  Trash2,
  UserPlus,
  UserRound,
  UserX,
} from "lucide-react";
import { mensagemErro } from "@/shared/services/api.js";
import {
  Button,
  Feedback,
  InputField,
  Modal,
  NumericInput,
  Spinner,
} from "@/shared/components/ui";
import { PageHeader } from "@/shared/components/layout";
import { useToast } from "@/shared/hooks/useToast.js";
import { dataISO, moeda } from "@/shared/utils/format.js";
import { useCatalogo } from "@/features/catalog/hooks/useCatalog.js";
import {
  useOrcamento,
  useSalvarOrcamento,
} from "@/features/budgets/hooks/useBudgets.js";
import {
  lerClienteDoOrcamento,
  limparClienteDoOrcamento,
} from "@/features/budgets/quoteCustomer.js";
import { CustomerForm } from "@/features/customers/components/CustomerForm.jsx";
import { CustomerTable } from "@/features/customers/components/CustomerTable.jsx";

const MAX_LINHAS = 17;
const linhaVazia = () => ({
  id_item: null,
  id_material: "",
  tipo_produto: "",
  quantidade: "",
  valor_unitario: "",
});
const preenchida = (linha) => Boolean(linha?.id_material || linha?.id_item);
const numero = (valor) => (valor === "" || valor == null ? 0 : Number(valor));

export default function NovoOrcamentos() {
  const { id } = useParams();
  const catalogo = useCatalogo();
  const orcamento = useOrcamento(id);

  const erro = catalogo.error || orcamento.error;
  if (erro) return <Feedback error={mensagemErro(erro)} />;
  if (catalogo.isLoading || orcamento.isLoading)
    return (
      <p className="loading-line" role="status">
        <Spinner /> Carregando orçamento...
      </p>
    );
  return (
    <Producao
      // A versão entra na chave: se o orçamento mudar no servidor (por exemplo,
      // um item vindo da calculadora), o formulário é remontado com os dados
      // novos em vez de salvar por cima de uma versão antiga.
      key={id ? `${id}-v${orcamento.data?.versao}` : "novo"}
      catalogo={catalogo.data?.itens || []}
      quote={orcamento.data}
    />
  );
}

function TrocarCliente({ fechar, escolher }) {
  const [cadastrando, setCadastrando] = useState(false);
  const toast = useToast();
  return (
    <Modal
      size="lg"
      title={cadastrando ? "Cadastrar cliente" : "Escolher cliente"}
      description={
        cadastrando
          ? "O cliente novo já fica vinculado a este orçamento."
          : "Os materiais já preenchidos continuam como estão."
      }
      onClose={fechar}
    >
      {cadastrando ? (
        <CustomerForm
          salvarLabel="Cadastrar e usar neste orçamento"
          onCancelar={() => setCadastrando(false)}
          onSalvo={(cliente) => {
            toast.success(`Cliente ${cliente.nome} cadastrado.`);
            escolher(cliente);
          }}
        />
      ) : (
        <>
          <div className="toolbar">
            <Button variant="neutral" onClick={() => setCadastrando(true)}>
              <UserPlus size={18} aria-hidden="true" /> Cadastrar novo cliente
            </Button>
            <Button variant="subtle" onClick={() => escolher(null)}>
              <UserX size={18} aria-hidden="true" /> Deixar sem cliente
            </Button>
          </div>
          <CustomerTable
            colunaAcoes="Selecionar"
            acoes={(cliente) => (
              <Button
                variant="neutral"
                onClick={() => escolher(cliente)}
                aria-label={`Selecionar ${cliente.nome}`}
              >
                <Check size={16} aria-hidden="true" /> Selecionar
              </Button>
            )}
          />
        </>
      )}
    </Modal>
  );
}

function Producao({ catalogo, quote }) {
  const navigate = useNavigate();
  const toast = useToast();
  const mutation = useSalvarOrcamento();
  const [trocandoCliente, setTrocandoCliente] = useState(false);
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [cliente, setCliente] = useState(() =>
    quote
      ? quote.id_cliente
        ? { id_cliente: quote.id_cliente, nome: quote.nome_cliente, email: quote.email }
        : null
      : lerClienteDoOrcamento(),
  );

  const { register, control, handleSubmit, setValue, getValues } = useForm({
    defaultValues: {
      linhas: quote?.itens?.length
        ? quote.itens.map((item) => ({
            id_item: item.id_item,
            id_material: item.id_material ?? "",
            tipo_produto: item.tipo_produto || "",
            quantidade: Number(item.quantidade),
            valor_unitario: Number(item.valor_unitario),
          }))
        : [linhaVazia()],
      desconto_tipo: quote?.desconto_tipo || "percentual",
      desconto_valor: quote ? Number(quote.desconto_valor) : 0,
      validade: dataISO(quote?.data_validade),
      prazo: dataISO(quote?.prazo_entrega),
      observacoes: quote?.observacoes || "",
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "linhas" });
  const linhas = useWatch({ control, name: "linhas" }) || [];
  const descontoTipo = useWatch({ control, name: "desconto_tipo" });
  const descontoValor = useWatch({ control, name: "desconto_valor" });

  const subtotal = linhas.reduce(
    (soma, linha) =>
      soma + (preenchida(linha) ? numero(linha.quantidade) * numero(linha.valor_unitario) : 0),
    0,
  );
  const desconto =
    descontoTipo === "percentual"
      ? (subtotal * numero(descontoValor)) / 100
      : numero(descontoValor);
  const total = Math.max(0, subtotal - desconto);

  const usadas = linhas.filter(preenchida);
  const problemas = [];
  if (!usadas.length) problemas.push("Escolha pelo menos um material.");
  if (usadas.some((linha) => numero(linha.quantidade) < 1))
    problemas.push("Informe a quantidade de cada material (mínimo 1).");
  if (usadas.some((linha) => linha.valor_unitario === "" || linha.valor_unitario == null))
    problemas.push("Informe o valor unitário de cada material.");
  if (descontoTipo === "percentual" && numero(descontoValor) > 100)
    problemas.push("O desconto não pode passar de 100%.");
  if (descontoTipo === "valor" && numero(descontoValor) > subtotal)
    problemas.push("O desconto não pode ser maior que o subtotal.");

  function escolherMaterial(index, valor) {
    const material = catalogo.find((m) => String(m.id_material) === valor);
    const atual = getValues(`linhas.${index}`);
    if (!material) {
      setValue(`linhas.${index}`, { ...linhaVazia(), id_item: null });
      return;
    }
    setValue(`linhas.${index}`, {
      ...atual,
      id_material: material.id_material,
      tipo_produto: material.nome,
      quantidade: atual.quantidade || 1,
      valor_unitario:
        Number(material.custo_unitario) + Number(material.lucro_unitario),
    });
    // Ao preencher a última linha, a próxima já aparece pronta.
    if (index === fields.length - 1 && fields.length < MAX_LINHAS)
      append(linhaVazia(), { shouldFocus: false });
  }

  function salvar(dados) {
    setTentouSalvar(true);
    if (problemas.length) return;
    const payload = {
      id_cliente: cliente?.id_cliente ?? null,
      itens: dados.linhas.filter(preenchida).map((linha) => ({
        id_item: linha.id_item || null,
        id_material: linha.id_material || null,
        tipo_produto: linha.tipo_produto,
        quantidade: numero(linha.quantidade),
        valor_unitario: numero(linha.valor_unitario),
      })),
      desconto_tipo: dados.desconto_tipo,
      desconto_valor: numero(dados.desconto_valor),
      data_validade: dados.validade || null,
      prazo_entrega: dados.prazo || null,
      observacoes: dados.observacoes.trim(),
      versao: quote?.versao,
    };
    mutation.mutate(
      { id: quote?.id_orcamento, payload },
      {
        onSuccess: (salvo) => {
          limparClienteDoOrcamento();
          toast.success(
            quote
              ? `Orçamento #${salvo.id_orcamento} atualizado.`
              : `Orçamento #${salvo.id_orcamento} criado.`,
          );
          navigate(`/status-orcamento/${salvo.id_orcamento}`);
        },
        onError: (erro) => toast.error(mensagemErro(erro)),
      },
    );
  }

  return (
    <>
      <PageHeader
        title={quote ? `Editar orçamento #${quote.id_orcamento}` : "Novo orçamento"}
        subtitle="Escolha os materiais, ajuste quantidades e valores e confira o total."
        back={quote ? `/status-orcamento/${quote.id_orcamento}` : "/orcamentos"}
      />

      <div className="client-strip">
        <UserRound size={20} aria-hidden="true" />
        <p>
          {cliente?.id_cliente ? (
            <>
              <strong>{cliente.nome}</strong>
              {cliente.email && <span>{cliente.email}</span>}
            </>
          ) : (
            <strong>Orçamento sem cliente vinculado</strong>
          )}
        </p>
        <Button variant="subtle" onClick={() => setTrocandoCliente(true)}>
          {cliente?.id_cliente ? "Trocar cliente" : "Escolher cliente"}
        </Button>
      </div>

      <form className="quote-form" onSubmit={handleSubmit(salvar)} noValidate>
        <section className="panel materials" aria-labelledby="materiais-titulo">
          <header className="panel-heading">
            <h2 id="materiais-titulo">Materiais e quantidades</h2>
            <small role="status">
              {usadas.length} de {MAX_LINHAS} materiais
            </small>
          </header>

          <div className="material-list">
            <div className="material-row material-head" aria-hidden="true">
              <span>Nº</span>
              <span>Material</span>
              <span>Quantidade</span>
              <span>Valor unitário</span>
              <span className="cell-number">Subtotal</span>
              <span />
            </div>
            {fields.map((field, index) => {
              const linha = linhas[index] || {};
              const ativa = preenchida(linha);
              const legado = linha.id_item && !linha.id_material;
              const arquivado =
                linha.id_material &&
                !catalogo.some((m) => String(m.id_material) === String(linha.id_material));
              const materialAtual = catalogo.find((m) => String(m.id_material) === String(linha.id_material));
              const valorCatalogo = materialAtual ? Number(materialAtual.custo_unitario) + Number(materialAtual.lucro_unitario) : null;
              const abaixoCusto = materialAtual && linha.valor_unitario !== "" && Number(linha.valor_unitario) < Number(materialAtual.custo_unitario);
              return (
                <div className="material-row" key={field.id}>
                  <span className="material-number">{String(index + 1).padStart(2, "0")}</span>
                  <select
                    aria-label={`Material ${index + 1}`}
                    value={linha.id_material || (legado ? "legado" : "")}
                    onChange={(event) => escolherMaterial(index, event.target.value)}
                  >
                    <option value="">Selecionar material</option>
                    {legado && <option value="legado">{linha.tipo_produto}</option>}
                    {arquivado && (
                      <option value={linha.id_material}>
                        {linha.tipo_produto} (fora do catálogo)
                      </option>
                    )}
                    {catalogo.map((m) => (
                      <option key={m.id_material} value={m.id_material}>
                        {m.categoria} · {m.nome}
                      </option>
                    ))}
                  </select>
                  <Controller
                    control={control}
                    name={`linhas.${index}.quantidade`}
                    render={({ field: campo }) => (
                      <NumericInput
                        aria-label={`Quantidade ${index + 1}`}
                        decimals={0}
                        max={10000000}
                        placeholder="0"
                        disabled={!ativa}
                        aria-invalid={
                          tentouSalvar && ativa && numero(campo.value) < 1 ? "true" : undefined
                        }
                        value={campo.value}
                        onChange={campo.onChange}
                        onBlur={campo.onBlur}
                      />
                    )}
                  />
                  <div className="material-price">
                  <Controller
                    control={control}
                    name={`linhas.${index}.valor_unitario`}
                    render={({ field: campo }) => (
                      <NumericInput
                        aria-label={`Valor unitário ${index + 1}`}
                        prefix="R$"
                        decimals={4}
                        max={10000000}
                        placeholder="0,00"
                        disabled={!ativa}
                        aria-invalid={
                          tentouSalvar && ativa && campo.value === "" ? "true" : undefined
                        }
                        value={campo.value}
                        onChange={campo.onChange}
                        onBlur={campo.onBlur}
                      />
                    )}
                  />
                  {materialAtual && <small>Catálogo: {moeda(valorCatalogo)}</small>}
                  {abaixoCusto && <small className="material-price-warning" role="status">Abaixo do custo de {moeda(materialAtual.custo_unitario)}</small>}
                  </div>
                  <output className="cell-number material-subtotal" aria-label={`Subtotal ${index + 1}`}>
                    {ativa ? moeda(numero(linha.quantidade) * numero(linha.valor_unitario)) : "—"}
                  </output>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remover material ${index + 1}`}
                    title="Remover material"
                    disabled={fields.length === 1 && !ativa}
                    onClick={() => (fields.length === 1 ? setValue("linhas.0", linhaVazia()) : remove(index))}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="materials-actions">
            <Button
              variant="neutral"
              disabled={fields.length >= MAX_LINHAS}
              onClick={() => append(linhaVazia(), { shouldFocus: false })}
            >
              <Plus size={18} aria-hidden="true" /> Adicionar material
            </Button>
            {fields.length >= MAX_LINHAS && <small>Limite de {MAX_LINHAS} materiais atingido.</small>}
          </div>
          {!catalogo.length && (
            <Feedback message="Nenhum material cadastrado. Peça ao administrador para preencher o catálogo em Papel." />
          )}
        </section>

        <section className="panel quote-summary" aria-labelledby="resumo-titulo">
          <header className="panel-heading">
            <h2 id="resumo-titulo">Resumo do orçamento</h2>
          </header>
          <div className="summary-grid">
            <fieldset className="field discount-field">
              <legend>Desconto</legend>
              <div className="discount-control">
                <div className="segmented" role="group" aria-label="Tipo de desconto">
                  {[
                    ["percentual", "%"],
                    ["valor", "R$"],
                  ].map(([tipo, rotulo]) => (
                    <button
                      key={tipo}
                      type="button"
                      aria-pressed={descontoTipo === tipo}
                      aria-label={tipo === "percentual" ? "Desconto em porcentagem" : "Desconto em reais"}
                      onClick={() => {
                        if (descontoTipo === tipo) return;
                        setValue("desconto_tipo", tipo);
                        setValue("desconto_valor", 0);
                      }}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
                <Controller
                  control={control}
                  name="desconto_valor"
                  render={({ field: campo }) => (
                    <NumericInput
                      aria-label={descontoTipo === "percentual" ? "Desconto em porcentagem" : "Desconto em reais"}
                      decimals={2}
                      minDecimals={descontoTipo === "percentual" ? 0 : 2}
                      max={descontoTipo === "percentual" ? 100 : 1000000000}
                      placeholder="0"
                      aria-invalid={desconto > subtotal ? "true" : undefined}
                      value={campo.value}
                      onChange={campo.onChange}
                      onBlur={campo.onBlur}
                    />
                  )}
                />
              </div>
            </fieldset>
            <InputField label="Validade do orçamento" type="date" {...register("validade")} />
            <InputField label="Prazo de entrega" type="date" {...register("prazo")} />
            <div className="field span-3">
              <label htmlFor="observacoes">Observações</label>
              <textarea
                id="observacoes"
                rows={3}
                maxLength={5000}
                placeholder="Acabamento, forma de entrega, combinados com o cliente..."
                {...register("observacoes")}
              />
            </div>
          </div>

          {tentouSalvar && problemas.length > 0 && (
            <div className="feedback error" role="alert">
              <strong>Antes de salvar:</strong>
              <ul>
                {problemas.map((problema) => (
                  <li key={problema}>{problema}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="totals-bar">
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{moeda(subtotal)}</dd>
            </div>
            <div>
              <dt>Desconto</dt>
              <dd>{desconto > 0 ? `− ${moeda(Math.min(desconto, subtotal))}` : moeda(0)}</dd>
            </div>
            <div className="totals-total">
              <dt>Total</dt>
              <dd>{moeda(total)}</dd>
            </div>
          </dl>
          <Button type="submit" loading={mutation.isPending}>
            <Save size={18} aria-hidden="true" />
            {mutation.isPending ? "Salvando..." : "Salvar orçamento"}
          </Button>
        </div>
      </form>

      {trocandoCliente && (
        <TrocarCliente
          fechar={() => setTrocandoCliente(false)}
          escolher={(novo) => {
            setCliente(novo);
            setTrocandoCliente(false);
          }}
        />
      )}
    </>
  );
}
