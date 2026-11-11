import { useContext, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { mensagemErro } from "@/shared/services/api.js";
import { SessionContext } from "@/app/SessionContext.js";
import { Button, Feedback, InputField, Modal, NumericInput, Spinner } from "@/shared/components/ui";
import { PageHeader } from "@/shared/components/layout";
import { useToast } from "@/shared/hooks/useToast.js";
import { decimal } from "@/shared/utils/format.js";
import {
  useCatalogo,
  useSalvarMaterial,
  useDeletarMaterial,
} from "@/features/catalog/hooks/useCatalog.js";

const NOVA_CATEGORIA = "__nova__";
const VALORES = {
  custo_fixo: "Custo fixo",
  custo_unitario: "Custo unitário",
  lucro_fixo: "Lucro fixo",
  lucro_unitario: "Lucro unitário",
};

export default function Papeis() {
  const { usuario } = useContext(SessionContext);
  const admin = usuario.tipo === "admin";
  const [editando, setEditando] = useState(null);
  const { data: dados, isLoading, error } = useCatalogo();

  const categorias = dados
    ? [...new Set([...dados.categorias, ...dados.itens.map((i) => i.categoria)])]
    : [];

  return (
    <>
      <PageHeader
        title="Papel"
        subtitle="Tipos de papel e acabamento, com custos e margens usados nos orçamentos."
        action={false}
      >
        {admin && (
          <Button onClick={() => setEditando({})}>
            <Plus size={18} aria-hidden="true" /> Novo tipo de papel
          </Button>
        )}
      </PageHeader>
      <Feedback error={error ? mensagemErro(error) : ""} />
      {isLoading ? (
        <p className="loading-line" role="status">
          <Spinner /> Carregando catálogo...
        </p>
      ) : dados ? (
        <>
          <div className="catalog-strip">
            <strong>
              {dados.itens.length} materiais em {categorias.length} categorias
            </strong>
            <small>Valores em reais, com até 4 casas decimais.</small>
          </div>
          <div className="catalog-grid">
            {categorias.map((categoria) => {
              const itens = dados.itens.filter((m) => m.categoria === categoria);
              return (
                <section className="panel category-card" key={categoria}>
                  <header>
                    <h2>{categoria}</h2>
                    {admin && (
                      <Button
                        variant="subtle"
                        onClick={() => setEditando({ categoria })}
                        aria-label={`Adicionar material em ${categoria}`}
                      >
                        <Plus size={16} aria-hidden="true" /> Adicionar
                      </Button>
                    )}
                  </header>
                  <div className="table-scroll" role="region" aria-label={`Materiais da categoria ${categoria}`} tabIndex={0}>
                    <table>
                      <caption className="sr-only">Custos e lucros dos materiais de {categoria}</caption>
                      <thead>
                        <tr>
                          <th scope="col">Material</th>
                          {Object.values(VALORES).map((rotulo) => (
                            <th scope="col" key={rotulo}>{rotulo}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map((m) => (
                          <tr key={m.id_material}>
                            <td>
                              {admin ? (
                                <button className="text-button" onClick={() => setEditando(m)} aria-label={`Editar ${m.nome}`}>
                                  <Pencil size={14} aria-hidden="true" /> {m.nome}
                                </button>
                              ) : (
                                m.nome
                              )}
                            </td>
                            {Object.keys(VALORES).map((key) => (
                              <td key={key}>{decimal(m[key])}</td>
                            ))}
                          </tr>
                        ))}
                        {!itens.length && (
                          <tr>
                            <td colSpan="5">Nenhum material nesta categoria.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        </>
      ) : null}
      {editando && (
        <MaterialModal material={editando} categorias={categorias} fechar={() => setEditando(null)} />
      )}
    </>
  );
}

function MaterialModal({ material, categorias, fechar }) {
  const toast = useToast();
  const mutation = useSalvarMaterial();
  const deleteMutation = useDeletarMaterial();
  const busy = mutation.isPending || deleteMutation.isPending;
  const [categoriaEscolhida, setCategoriaEscolhida] = useState(material.categoria || "");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      nova_categoria: "",
      nome: material.nome || "",
      custo_fixo: Number(material.custo_fixo || 0),
      custo_unitario: Number(material.custo_unitario || 0),
      lucro_fixo: Number(material.lucro_fixo || 0),
      lucro_unitario: Number(material.lucro_unitario || 0),
    },
  });

  const onSubmit = (dados) => {
    const categoria =
      categoriaEscolhida === NOVA_CATEGORIA ? dados.nova_categoria.trim() : categoriaEscolhida;
    const payload = { categoria, nome: dados.nome.trim() };
    for (const chave of Object.keys(VALORES)) payload[chave] = dados[chave] === "" ? 0 : dados[chave];
    mutation.mutate(
      { id: material.id_material, payload },
      {
        onSuccess: () => {
          toast.success(
            material.id_material ? `${payload.nome} atualizado.` : `${payload.nome} adicionado em ${categoria}.`,
          );
          fechar();
        },
      },
    );
  };

  function remover() {
    if (!window.confirm("Remover este material do catálogo? Os orçamentos anteriores serão preservados."))
      return;
    deleteMutation.mutate(material.id_material, {
      onSuccess: () => {
        toast.success(`${material.nome} removido do catálogo.`);
        fechar();
      },
    });
  }

  const erro = mutation.error || deleteMutation.error;

  return (
    <Modal
      title={material.id_material ? "Editar material" : "Novo tipo de papel"}
      description="O material fica disponível na hora para os próximos orçamentos."
      onClose={fechar}
    >
      <form className="form-grid" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="field span-2">
          <label htmlFor="categoria">Categoria</label>
          <select
            id="categoria"
            value={categoriaEscolhida}
            onChange={(event) => setCategoriaEscolhida(event.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={NOVA_CATEGORIA}>+ Criar nova categoria</option>
          </select>
        </div>
        {categoriaEscolhida === NOVA_CATEGORIA && (
          <InputField
            className="span-2"
            label="Nome da nova categoria"
            {...register("nova_categoria", {
              validate: (v) => v.trim().length >= 2 || "Informe o nome da categoria.",
            })}
            error={errors.nova_categoria?.message}
            maxLength={50}
            placeholder="Ex.: Papel fotográfico"
          />
        )}
        <InputField
          className="span-2"
          label="Nome do material"
          {...register("nome", { validate: (v) => v.trim().length > 0 || "Informe o nome do material." })}
          error={errors.nome?.message}
          maxLength={100}
          placeholder="Ex.: Couchê brilho 250g"
        />
        {Object.entries(VALORES).map(([name, label]) => (
          <div className="field" key={name}>
            <label htmlFor={`valor-${name}`}>{label}</label>
            <Controller
              control={control}
              name={name}
              render={({ field }) => (
                <NumericInput
                  id={`valor-${name}`}
                  prefix="R$"
                  decimals={4}
                  max={1000000000}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>
        ))}
        {erro && (
          <div className="span-2">
            <Feedback error={mensagemErro(erro)} />
          </div>
        )}
        <div className="form-actions span-2">
          {material.id_material && (
            <Button variant="subtle" className="text-danger" disabled={busy} onClick={remover} style={{ marginRight: "auto" }}>
              <Trash2 size={18} aria-hidden="true" /> Remover
            </Button>
          )}
          <Button variant="subtle" onClick={fechar} disabled={busy}>
            <X size={18} aria-hidden="true" /> Cancelar
          </Button>
          <Button type="submit" disabled={busy || !categoriaEscolhida}>
            <Save size={18} aria-hidden="true" /> {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
