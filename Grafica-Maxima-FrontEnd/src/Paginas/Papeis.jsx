import { useContext, useRef, useState, useEffect } from 'react';
import { mensagemErro } from '../services/api';
import { SessionContext } from '../services/session';
import { Button, Feedback, InputField, Spinner } from '../components/ui';
import { PageHeader } from '../components/layout';
import { decimal } from '../services/format';
import { useCatalogo, useSalvarMaterial, useDeletarMaterial } from '../hooks/useCatalogo';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export default function Papeis() {
  const { usuario } = useContext(SessionContext);
  const [editando, setEditando] = useState(null);

  const { data: dados, isLoading, error: queryError } = useCatalogo();
  const error = queryError ? mensagemErro(queryError) : '';

  const categorias = dados ? [...new Set([...dados.categorias, ...dados.itens.map(i => i.categoria)])] : [];
  
  return <><PageHeader title="Papel" subtitle="Cadastre custos e margens dos papéis e acabamentos." /><Feedback error={error} />
    {isLoading ? <div className="panel" style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner /> <span style={{marginLeft: '1rem'}}>Carregando catálogo...</span></div> : dados ? <>
    <div className="catalog-strip"><strong>Papéis e acabamentos</strong><small>{categorias.length} categorias · valores em R$</small></div>
    <div className="catalog-grid">{categorias.map(categoria => <section className="panel category-card" key={categoria}><header><h2>{categoria}</h2>{usuario.tipo === 'admin' && <Button variant="subtle" onClick={() => setEditando({ categoria })} aria-label={`Adicionar material em ${categoria}`}>+ Adicionar</Button>}</header><div className="table-scroll"><table><thead><tr><th>Subcategoria</th><th>Custo fixo</th><th>Custo unit.</th><th>Lucro fixo</th><th>Lucro unit.</th></tr></thead><tbody>
      {dados.itens.filter(m => m.categoria === categoria).map(m => <tr key={m.id_material}><td>{usuario.tipo === 'admin' ? <button className="text-button" onClick={() => setEditando(m)}>{m.nome}</button> : m.nome}</td>{['custo_fixo','custo_unitario','lucro_fixo','lucro_unitario'].map(key => <td key={key}>{decimal(m[key])}</td>)}</tr>)}
      {!dados.itens.some(m => m.categoria === categoria) && <tr><td colSpan="5">Nenhuma subcategoria cadastrada.</td></tr>}
    </tbody></table></div></section>)}</div>
    </> : null}
    {editando && <MaterialModal material={editando} categorias={dados.categorias} fechar={() => setEditando(null)} salvo={() => setEditando(null)} />}
  </>;
}

const materialSchema = z.object({
  categoria: z.string().min(1, 'A categoria é obrigatória'),
  nome: z.string().min(1, 'A subcategoria é obrigatória').max(100),
  custo_fixo: z.coerce.number().min(0, 'Não pode ser negativo'),
  custo_unitario: z.coerce.number().min(0, 'Não pode ser negativo'),
  lucro_fixo: z.coerce.number().min(0, 'Não pode ser negativo'),
  lucro_unitario: z.coerce.number().min(0, 'Não pode ser negativo'),
});

function MaterialModal({ material, categorias, fechar, salvo }) {
  const ref = useRef(null);
  
  const mutation = useSalvarMaterial();
  const deleteMutation = useDeletarMaterial();
  
  const busy = mutation.isPending || deleteMutation.isPending;
  const submitError = mutation.error ? mensagemErro(mutation.error) : deleteMutation.error ? mensagemErro(deleteMutation.error) : '';

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      categoria: material.categoria || '',
      nome: material.nome || '',
      custo_fixo: material.custo_fixo || 0,
      custo_unitario: material.custo_unitario || 0,
      lucro_fixo: material.lucro_fixo || 0,
      lucro_unitario: material.lucro_unitario || 0,
    }
  });

  useEffect(() => { ref.current.showModal(); }, []);
  
  const onSubmit = (data) => {
    mutation.mutate({ id: material.id_material, payload: data }, { onSuccess: salvo });
  };
  
  async function remover() {
    if (!window.confirm('Remover este material do catálogo? Os orçamentos anteriores serão preservados.')) return;
    deleteMutation.mutate(material.id_material, { onSuccess: salvo });
  }

  return <dialog className="material-dialog" ref={ref} onCancel={fechar} aria-labelledby="material-title"><form onSubmit={handleSubmit(onSubmit)}><header><h2 id="material-title">{material.id_material ? 'Editar material' : 'Nova subcategoria'}</h2><Button variant="subtle" type="button" onClick={fechar} disabled={busy}>Fechar</Button></header>
    <div className="field">
      <label htmlFor="categoria">Categoria</label>
      <select id="categoria" {...register('categoria')}>
        <option value="">Selecione...</option>
        {categorias.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {errors.categoria && <small role="alert" className="error-text" style={{ color: 'var(--danger-700)', marginTop: '0.25rem', display: 'block' }}>{errors.categoria.message}</small>}
    </div>
    <InputField label="Subcategoria" {...register('nome')} error={errors.nome?.message} maxLength={100} />
    {Object.entries({ custo_fixo: 'Custo fixo (R$)', custo_unitario: 'Custo unitário (R$)', lucro_fixo: 'Lucro fixo (R$)', lucro_unitario: 'Lucro unitário (R$)' }).map(([name, label]) => <InputField key={name} label={label} {...register(name)} error={errors[name]?.message} type="number" min="0" max="1000000000" step="0.0001" />)}
    <Feedback error={submitError} />
    <Button type="submit" disabled={busy}>{mutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
    {material.id_material && <Button variant="subtle" type="button" disabled={busy} onClick={remover}>Remover do catálogo</Button>}
  </form></dialog>;
}
