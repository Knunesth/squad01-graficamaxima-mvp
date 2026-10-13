import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { mensagemErro } from "../../services/api.js";
import { Button, Feedback, InputField } from "../../components/ui";
import { PageHeader } from "../../components/layout";
import { decimal, moeda } from "../../lib/format.js";
import { useCatalogo } from "../../hooks/useCatalogo.js";
import { useOrcamento, useSalvarOrcamento } from "../../hooks/useOrcamentos.js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

const contexto = "01 · Cliente (opcional)    /    02 · Monte o orçamento";
function limparCliente() {
  sessionStorage.removeItem("orcamento_cliente");
}
export function EscolherCliente() {
  return (
    <>
      <PageHeader
        title="Novo orçamento"
        subtitle={contexto}
        back="/orcamentos"
      />
      <section className="client-choice">
        <h2>Como você quer começar?</h2>
        <p>Monte o orçamento agora ou escolha um cliente para identificar o pedido.</p>
        <Link
          className="quick-quote"
          to="/orcamentos/novo/producao"
          onClick={limparCliente}
        >
          <span className="quick-quote-copy">
            <strong>Orçamento sem cadastro</strong>
            <span>Vá direto aos materiais e valores. Os dados do cliente são opcionais.</span>
          </span>
          <span className="quick-quote-action">Continuar sem cliente <ArrowRight size={18} aria-hidden="true" /></span>
        </Link>
        <div className="choice-grid">
          <article className="panel">
            <h3>Cliente já cadastrado</h3>
            <p>Localize o cadastro pelo e-mail e CPF ou CNPJ do cliente.</p>
            <Link
              className="button button-primary"
              to="/orcamentos/novo/cliente"
            >
              Selecionar cliente
            </Link>
          </article>
          <article className="panel">
            <h3>Novo cliente</h3>
            <p>
              Cadastre os dados de uma pessoa ou empresa para o primeiro
              orçamento.
            </p>
            <Link
              className="button button-neutral"
              to="/orcamentos/novo/cadastro"
            >
              Cadastrar cliente
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}

const clienteSchemaExistente = z.object({
  email: z.string().email("E-mail inválido"),
  cpf_cnpj: z.string().min(11, "CPF/CNPJ muito curto"),
});

const clienteSchemaNovo = clienteSchemaExistente.extend({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  telefone: z.string().min(10, "Telefone inválido"),
});

export function ClienteFormulario({ novo = false }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(novo ? clienteSchemaNovo : clienteSchemaExistente),
  });

  const onSubmit = async (data) => {
    setError("");
    try {
      const response = await api.post(
        novo ? "/api/clientes" : "/api/clientes/buscar",
        data,
      );
      sessionStorage.setItem(
        "orcamento_cliente",
        JSON.stringify(response.data),
      );
      navigate("/orcamentos/novo/producao");
    } catch (e) {
      setError(mensagemErro(e));
    }
  };

  return (
    <>
      <PageHeader
        title={novo ? "Cadastrar novo cliente" : "Cliente cadastrado"}
        subtitle={contexto}
        back="/orcamentos/novo"
      />
      <form
        className={`panel client-form ${novo ? "client-form-new" : ""}`}
        onSubmit={handleSubmit(onSubmit)}
      >
        <h2>{novo ? "Dados do novo cliente" : "Localizar cadastro"}</h2>
        <p>
          {novo
            ? "Preencha os dados abaixo para cadastrar e continuar."
            : "Informe os dados para selecionar o cliente do orçamento."}
        </p>
        {novo && (
          <>
            <InputField
              label="Nome do cliente ou da empresa"
              {...register("nome")}
              error={errors.nome?.message}
              maxLength={100}
              placeholder="Digite o nome completo ou a razão social"
            />
            <InputField
              label="Telefone"
              {...register("telefone")}
              type="tel"
              error={errors.telefone?.message}
              maxLength={20}
              placeholder="(00) 00000-0000"
            />
          </>
        )}
        <InputField
          label="E-mail"
          {...register("email")}
          type="email"
          error={errors.email?.message}
          maxLength={100}
          placeholder="Digite o e-mail do cliente"
        />
        <InputField
          label="CPF ou CNPJ"
          {...register("cpf_cnpj")}
          error={errors.cpf_cnpj?.message}
          maxLength={20}
          placeholder="Digite o CPF ou CNPJ"
        />
        <Feedback error={error} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Aguarde..."
            : novo
              ? "Cadastrar e continuar"
              : "Selecionar e continuar"}
        </Button>
        <Link className="button button-subtle" to="/orcamentos/novo/producao" onClick={limparCliente}>
          Continuar sem cliente
        </Link>
        <small>
          {novo
            ? "Os dados serão usados para identificar o cliente nos pedidos."
            : "O cadastro será vinculado ao novo orçamento."}
        </small>
      </form>
    </>
  );
}

const vazia = () => ({
  id_material: "",
  tipo_produto: "",
  quantidade: "",
  valor_unitario: "",
});
function lerCliente() {
  try {
    return JSON.parse(sessionStorage.getItem("orcamento_cliente") || "null");
  } catch {
    return null;
  }
}

export default function NovoOrcamentos() {
  const { id } = useParams();

  const {
    data: catalogoResponse,
    isLoading: loadingCatalogo,
    error: errorCatalogo,
  } = useCatalogo();
  const {
    data: quote,
    isLoading: loadingQuote,
    error: errorQuote,
  } = useOrcamento(id);

  const error = errorCatalogo
    ? mensagemErro(errorCatalogo)
    : errorQuote
      ? mensagemErro(errorQuote)
      : "";
  const isLoading = loadingCatalogo || loadingQuote;

  if (error) return <Feedback error={error} />;
  if (isLoading) return <p role="status">Carregando orçamento...</p>;
  return (
    <Producao
      key={id || "novo"}
      catalogo={catalogoResponse?.itens || []}
      quote={quote}
    />
  );
}
import { useFieldArray, useWatch } from "react-hook-form";

const itemSchema = z.object({
  id_material: z.union([z.number(), z.string()]).optional(),
  id_item: z.union([z.number(), z.string()]).optional(),
  tipo_produto: z.string().optional(),
  quantidade: z.union([z.number(), z.string()]).optional(),
  valor_unitario: z.union([z.number(), z.string()]).optional(),
});

const producaoSchema = z
  .object({
    linhas: z.array(itemSchema),
    desconto_tipo: z.enum(["percentual", "valor"]),
    desconto_valor: z.coerce.number().min(0, "Desconto inválido"),
    validade: z.string().optional(),
  })
  .refine(
    (data) => {
      const itens = data.linhas.filter(
        (l) => (l.id_material && l.id_material !== "legado") || l.id_item,
      );
      return itens.length > 0;
    },
    { message: "Selecione pelo menos um material válido.", path: ["root"] },
  );

function ConfirmarRemocao({ material, cancelar, confirmar }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="remove-material-dialog"
      aria-labelledby="remove-material-title"
      aria-describedby="remove-material-description"
      onCancel={cancelar}
      onClick={(event) => {
        if (event.target === event.currentTarget) cancelar();
      }}
    >
      <h2 id="remove-material-title">Remover material?</h2>
      <p id="remove-material-description">
        Deseja remover {material.nome ? <strong>{material.nome}</strong> : `a linha ${material.numero}`} do orçamento? A quantidade e o valor desta linha também serão removidos.
      </p>
      <div className="remove-material-dialog-actions">
        <Button variant="neutral" onClick={cancelar} autoFocus>Cancelar</Button>
        <Button onClick={confirmar}>Remover</Button>
      </div>
    </dialog>
  );
}

function Producao({ catalogo, quote }) {
  const navigate = useNavigate();
  const [materialRemover, setMaterialRemover] = useState(null);
  const [cliente] = useState(() =>
    quote
      ? {
          id_cliente: quote.id_cliente,
          nome: quote.nome_cliente,
          email: quote.email,
        }
      : lerCliente(),
  );

  const linhasIniciais = quote?.itens || [];
  const defaultLinhas = [
    ...linhasIniciais,
    ...Array.from({ length: Math.max(0, 3 - linhasIniciais.length) }, vazia),
  ];

  const mutation = useSalvarOrcamento();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(producaoSchema),
    defaultValues: {
      linhas: defaultLinhas,
      desconto_tipo: quote?.desconto_tipo || "percentual",
      desconto_valor: quote?.desconto_valor || "0",
      validade: quote?.data_validade?.slice(0, 10) || "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "linhas" });

  const watchLinhas = useWatch({ control, name: "linhas" }) || [];
  const watchDescontoTipo =
    useWatch({ control, name: "desconto_tipo" }) || "percentual";
  const watchDescontoValor = useWatch({ control, name: "desconto_valor" }) || 0;

  const subtotal = watchLinhas.reduce(
    (sum, l) =>
      sum + (Number(l.quantidade) || 0) * (Number(l.valor_unitario) || 0),
    0,
  );
  const descontoReal =
    watchDescontoTipo === "percentual"
      ? (subtotal * Number(watchDescontoValor || 0)) / 100
      : Number(watchDescontoValor || 0);
  const total = subtotal - descontoReal;

  function selecionar(index, value) {
    const material = catalogo.find((m) => String(m.id_material) === value);
    if (material) {
      setValue(`linhas.${index}.id_material`, material.id_material);
      setValue(`linhas.${index}.tipo_produto`, material.nome);
      setValue(
        `linhas.${index}.quantidade`,
        watchLinhas[index]?.quantidade || 1,
      );
      setValue(
        `linhas.${index}.valor_unitario`,
        Number(material.custo_unitario) + Number(material.lucro_unitario),
      );
    } else {
      setValue(`linhas.${index}.id_material`, "");
      setValue(`linhas.${index}.tipo_produto`, "");
      setValue(`linhas.${index}.quantidade`, "");
      setValue(`linhas.${index}.valor_unitario`, "");
    }
  }

  const onSubmit = (data) => {
    if (total < 0) return; // Optional extra check

    const itens = data.linhas.filter((l) => l.id_material || l.id_item);
    const payload = {
      id_cliente: cliente?.id_cliente ?? null,
      itens,
      desconto_tipo: data.desconto_tipo,
      desconto_valor: data.desconto_valor || 0,
      data_validade: data.validade || null,
      prazo_entrega: quote?.prazo_entrega || null,
      observacoes: quote?.observacoes || "",
      versao: quote?.versao,
    };

    mutation.mutate(
      { id: quote?.id_orcamento, payload },
      {
        onSuccess: () => {
          sessionStorage.removeItem("orcamento_cliente");
          navigate("/orcamentos", {
            state: { message: "Orçamento salvo com sucesso." },
          });
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        title={quote ? "Editar orçamento" : "Custo de produção"}
        subtitle="Cliente opcional · Monte o orçamento"
        back="/orcamentos"
      />
      <div className="client-strip">
        <strong>
          {cliente?.id_cliente
            ? `Cliente: ${cliente.nome}${cliente.email ? ` · ${cliente.email}` : ""}`
            : "Cliente não vinculado"}
        </strong>
        {!quote && (
          <Link className="button button-subtle" to="/orcamentos/novo">
            {cliente?.id_cliente ? "Trocar cliente" : "Selecionar cliente"}
          </Link>
        )}
      </div>
      <form className="production-grid" onSubmit={handleSubmit(onSubmit)}>
        <section className="panel materials">
          <h2>Materiais e quantidades</h2>
          <small>
            Selecione os materiais e informe as quantidades. Adicione outras linhas quando precisar.
          </small>
          <div className="materials-scroll">
            <div className="material-row material-head">
              <span>Nº</span>
              <span>Material</span>
              <span>Qtd.</span>
              <span>Valor unit. (R$)</span>
              <span>Subtotal (R$)</span>
              <span className="sr-only">Remover</span>
            </div>
            {fields.map((field, index) => {
              const linha = watchLinhas[index] || {};
              const isLegacy = linha.id_item && !linha.id_material;
              return (
                <div className="material-row" key={field.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <select
                    aria-label={`Material ${index + 1}`}
                    value={linha.id_material || (isLegacy ? "legado" : "")}
                    onChange={(e) => selecionar(index, e.target.value)}
                  >
                    <option value="">Selecionar material</option>
                    {isLegacy && (
                      <option value="legado">{linha.tipo_produto}</option>
                    )}
                    {linha.id_material &&
                      !catalogo.some(
                        (m) =>
                          String(m.id_material) === String(linha.id_material),
                      ) && (
                        <option value={linha.id_material}>
                          {linha.tipo_produto} (arquivado)
                        </option>
                      )}
                    {catalogo.map((m) => (
                      <option key={m.id_material} value={m.id_material}>
                        {m.categoria} · {m.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`Quantidade ${index + 1}`}
                    {...register(`linhas.${index}.quantidade`)}
                    type="number"
                    min="1"
                    max="10000000"
                    step="1"
                    placeholder="0"
                    required={!!(linha.id_material || linha.id_item)}
                    disabled={!linha.id_material && !linha.id_item}
                  />
                  <input
                    aria-label={`Valor unitário ${index + 1}`}
                    {...register(`linhas.${index}.valor_unitario`)}
                    type="number"
                    min="0"
                    max="10000000"
                    step="0.0001"
                    placeholder="0,00"
                    required={!!(linha.id_material || linha.id_item)}
                    disabled={!linha.id_material && !linha.id_item}
                  />
                  <span>
                    {decimal(
                      Number(linha.quantidade || 0) *
                        Number(linha.valor_unitario || 0),
                    )}
                  </span>
                  <button
                    type="button"
                    className="remove-material"
                    aria-label={`Remover material ${index + 1}`}
                    title="Remover material"
                    disabled={fields.length === 1}
                    onClick={() => setMaterialRemover({ id: field.id, numero: index + 1, nome: linha.tipo_produto })}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="materials-actions">
            <Button
              variant="neutral"
              type="button"
              disabled={fields.length >= 17}
              onClick={() => append(vazia(), { shouldFocus: false })}
            >
              <Plus size={18} aria-hidden="true" /> Adicionar material
            </Button>
            <small role="status">{fields.length >= 17 ? "Limite de 17 materiais atingido" : `${fields.length} de 17 linhas`}</small>
          </div>
          <small>Subtotal de cada item = quantidade × valor unitário.</small>
          {!catalogo.length && (
            <Feedback message="Nenhum material cadastrado. Peça ao administrador para preencher o catálogo em Papel." />
          )}
        </section>
        <aside className="panel quote-summary">
          <h2>Resumo do orçamento</h2>
          <p>Subtotal dos materiais</p>
          <strong className="subtotal">{moeda(subtotal)}</strong>
          <strong>Desconto no pedido</strong>
          <div className="discount-toggle">
            <Button
              variant="neutral"
              type="button"
              aria-pressed={watchDescontoTipo === "percentual"}
              onClick={() => {
                setValue("desconto_tipo", "percentual");
                setValue("desconto_valor", "0");
              }}
            >
              Percentual (%)
            </Button>
            <Button
              variant="neutral"
              type="button"
              aria-pressed={watchDescontoTipo === "valor"}
              onClick={() => {
                setValue("desconto_tipo", "valor");
                setValue("desconto_valor", "0");
              }}
            >
              Valor (R$)
            </Button>
          </div>
          <InputField
            label={`Desconto (${watchDescontoTipo === "percentual" ? "%" : "R$"})`}
            {...register("desconto_valor")}
            type="number"
            min="0"
            max={watchDescontoTipo === "percentual" ? 100 : subtotal}
            step="0.01"
          />
          <small>O desconto será aplicado sobre o subtotal.</small>
          <div className="quote-total">
            <small>TOTAL DO ORÇAMENTO</small>
            <strong>{moeda(total)}</strong>
          </div>
          <InputField
            label="Validade do orçamento"
            {...register("validade")}
            type="date"
          />

          {errors.root && <Feedback error={errors.root.message} />}
          {total < 0 && (
            <Feedback error="O desconto não pode ultrapassar o subtotal." />
          )}
          {mutation.error && <Feedback error={mensagemErro(mutation.error)} />}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar orçamento"}
          </Button>
        </aside>
      </form>
      {materialRemover && (
        <ConfirmarRemocao
          material={materialRemover}
          cancelar={() => setMaterialRemover(null)}
          confirmar={() => {
            const index = fields.findIndex((field) => field.id === materialRemover.id);
            if (index >= 0 && fields.length > 1) remove(index);
            setMaterialRemover(null);
          }}
        />
      )}
    </>
  );
}
