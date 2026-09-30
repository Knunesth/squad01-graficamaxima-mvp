import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { mensagemErro } from '../services/api';
import { Button, Feedback, InputField } from '../components/ui';
import { PageHeader } from '../components/layout';
import { decimal, moeda } from '../services/format';
import { useCatalogo } from '../hooks/useCatalogo';
import { useOrcamento, useSalvarOrcamento } from '../hooks/useOrcamentos';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const contexto = '01 · Identifique o cliente    /    02 · Monte o orçamento';
export function EscolherCliente() {
  return <><PageHeader title="Novo orçamento" subtitle={contexto} back="/orcamentos" /><section className="client-choice"><h2>Para quem é este orçamento?</h2><p>Selecione uma opção para continuar.</p><div className="choice-grid">
    <article className="panel"><h3>Cliente já cadastrado</h3><p>Localize o cadastro pelo e-mail e CPF ou CNPJ do cliente.</p><Link className="button button-primary" to="/orcamentos/novo/cliente">Selecionar cliente</Link></article>
    <article className="panel"><h3>Novo cliente</h3><p>Cadastre os dados de uma pessoa ou empresa para o primeiro orçamento.</p><Link className="button button-neutral" to="/orcamentos/novo/cadastro">Cadastrar cliente</Link></article>
  </div></section></>;
}

const clienteSchemaExistente = z.object({
  email: z.string().email('E-mail inválido'),
  cpf_cnpj: z.string().min(11, 'CPF/CNPJ muito curto')
});

const clienteSchemaNovo = clienteSchemaExistente.extend({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  telefone: z.string().min(10, 'Telefone inválido')
});

export function ClienteFormulario({ novo = false }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(novo ? clienteSchemaNovo : clienteSchemaExistente)
  });

  const onSubmit = async (data) => {
    setError('');
    try {
      const response = await api.post(novo ? '/api/clientes' : '/api/clientes/buscar', data);
      sessionStorage.setItem('orcamento_cliente', JSON.stringify(response.data));
      navigate('/orcamentos/novo/producao');
    } catch (e) { 
      setError(mensagemErro(e)); 
    }
  };

  return <><PageHeader title={novo ? 'Cadastrar novo cliente' : 'Cliente cadastrado'} subtitle={contexto} back="/orcamentos/novo" />
  <form className="panel client-form" onSubmit={handleSubmit(onSubmit)}>
    <h2>{novo ? 'Dados do novo cliente' : 'Localizar cadastro'}</h2><p>{novo ? 'Preencha os dados abaixo para cadastrar e continuar.' : 'Informe os dados para selecionar o cliente do orçamento.'}</p>
    {novo && <>
      <InputField label="Nome do cliente ou da empresa" {...register('nome')} error={errors.nome?.message} maxLength={100} placeholder="Digite o nome completo ou a razão social" />
      <InputField label="Telefone" {...register('telefone')} type="tel" error={errors.telefone?.message} maxLength={20} placeholder="(00) 00000-0000" />
    </>}
    <InputField label="E-mail" {...register('email')} type="email" error={errors.email?.message} maxLength={100} placeholder="Digite o e-mail do cliente" />
    <InputField label="CPF ou CNPJ" {...register('cpf_cnpj')} error={errors.cpf_cnpj?.message} maxLength={20} placeholder="Digite o CPF ou CNPJ" />
    <Feedback error={error} />
    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Aguarde...' : novo ? 'Cadastrar e continuar' : 'Selecionar e continuar'}</Button>
    <small>{novo ? 'Os dados serão usados para identificar o cliente nos pedidos.' : 'O cadastro será vinculado ao novo orçamento.'}</small>
  </form></>;
}

const vazia = () => ({ id_material: '', tipo_produto: '', quantidade: '', valor_unitario: '' });
function lerCliente() { try { return JSON.parse(sessionStorage.getItem('orcamento_cliente') || 'null'); } catch { return null; } }

export default function NovoOrcamentos() {
  const { id } = useParams();
  
  const { data: catalogoResponse, isLoading: loadingCatalogo, error: errorCatalogo } = useCatalogo();
  const { data: quote, isLoading: loadingQuote, error: errorQuote } = useOrcamento(id);

  const error = errorCatalogo ? mensagemErro(errorCatalogo) : errorQuote ? mensagemErro(errorQuote) : '';
  const isLoading = loadingCatalogo || loadingQuote;

  if (error) return <Feedback error={error} />;
  if (isLoading) return <p role="status">Carregando orçamento...</p>;
  return <Producao key={id || 'novo'} catalogo={catalogoResponse?.itens || []} quote={quote} />;
}
import { useFieldArray, useWatch } from 'react-hook-form';

const itemSchema = z.object({
  id_material: z.union([z.number(), z.string()]).optional(),
  id_item: z.union([z.number(), z.string()]).optional(),
  tipo_produto: z.string().optional(),
  quantidade: z.union([z.number(), z.string()]).optional(),
  valor_unitario: z.union([z.number(), z.string()]).optional(),
});

const producaoSchema = z.object({
  linhas: z.array(itemSchema),
  desconto_tipo: z.enum(['percentual', 'valor']),
  desconto_valor: z.coerce.number().min(0, 'Desconto inválido'),
  validade: z.string().optional()
}).refine(data => {
  const itens = data.linhas.filter(l => (l.id_material && l.id_material !== 'legado') || l.id_item);
  return itens.length > 0;
}, { message: "Selecione pelo menos um material válido.", path: ["root"] });

function Producao({ catalogo, quote }) {
  const navigate = useNavigate();
  const [cliente] = useState(() => quote ? { id_cliente: quote.id_cliente, nome: quote.nome_cliente, email: quote.email } : lerCliente());
  
  const linhasIniciais = quote?.itens || [];
  const defaultLinhas = [...linhasIniciais, ...Array.from({ length: Math.max(0, 17 - linhasIniciais.length) }, vazia)];

  const mutation = useSalvarOrcamento();

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(producaoSchema),
    defaultValues: {
      linhas: defaultLinhas,
      desconto_tipo: quote?.desconto_tipo || 'percentual',
      desconto_valor: quote?.desconto_valor || '0',
      validade: quote?.data_validade?.slice(0,10) || ''
    }
  });

  const { fields } = useFieldArray({ control, name: "linhas" });
  
  const watchLinhas = useWatch({ control, name: 'linhas' }) || [];
  const watchDescontoTipo = useWatch({ control, name: 'desconto_tipo' }) || 'percentual';
  const watchDescontoValor = useWatch({ control, name: 'desconto_valor' }) || 0;

  const subtotal = watchLinhas.reduce((sum, l) => sum + (Number(l.quantidade) || 0) * (Number(l.valor_unitario) || 0), 0);
  const descontoReal = watchDescontoTipo === 'percentual' ? subtotal * Number(watchDescontoValor || 0) / 100 : Number(watchDescontoValor || 0);
  const total = subtotal - descontoReal;

  function selecionar(index, value) {
    const material = catalogo.find(m => String(m.id_material) === value);
    if (material) {
      setValue(`linhas.${index}.id_material`, material.id_material);
      setValue(`linhas.${index}.tipo_produto`, material.nome);
      setValue(`linhas.${index}.quantidade`, watchLinhas[index]?.quantidade || 1);
      setValue(`linhas.${index}.valor_unitario`, Number(material.custo_unitario) + Number(material.lucro_unitario));
    } else {
      setValue(`linhas.${index}.id_material`, '');
      setValue(`linhas.${index}.tipo_produto`, '');
      setValue(`linhas.${index}.quantidade`, '');
      setValue(`linhas.${index}.valor_unitario`, '');
    }
  }

  const onSubmit = (data) => {
    if (total < 0) return; // Optional extra check
    
    const itens = data.linhas.filter(l => l.id_material || l.id_item);
    const payload = { 
      id_cliente: cliente.id_cliente, 
      itens, 
      desconto_tipo: data.desconto_tipo, 
      desconto_valor: data.desconto_valor || 0, 
      data_validade: data.validade || null, 
      prazo_entrega: quote?.prazo_entrega || null, 
      observacoes: quote?.observacoes || '', 
      versao: quote?.versao 
    };
    
    mutation.mutate({ id: quote?.id_orcamento, payload }, {
      onSuccess: () => {
        sessionStorage.removeItem('orcamento_cliente');
        navigate('/orcamentos', { state: { message: 'Orçamento salvo com sucesso.' } });
      }
    });
  };

  if (!cliente?.id_cliente) return <><Feedback error="Selecione um cliente antes de montar o orçamento." /><Link className="button button-primary" to="/orcamentos/novo">Selecionar cliente</Link></>;

  return <><PageHeader title={quote ? 'Editar orçamento' : 'Custo de produção'} subtitle="01 · Cliente identificado    /    02 · Monte o orçamento" back="/orcamentos" />
    <div className="client-strip"><strong>Cliente: {cliente.nome} · {cliente.email}</strong>{!quote && <Link className="button button-subtle" to="/orcamentos/novo">Trocar cliente</Link>}</div>
    <form className="production-grid" onSubmit={handleSubmit(onSubmit)}>
      <section className="panel materials"><h2>Materiais e quantidades</h2><small>Preencha os itens usados na produção. Os 17 espaços estão disponíveis.</small>
        <div className="materials-scroll"><div className="material-row material-head"><span>Nº</span><span>Material</span><span>Qtd.</span><span>Valor unit. (R$)</span><span>Subtotal (R$)</span></div>
        {fields.map((field, index) => {
          const linha = watchLinhas[index] || {};
          const isLegacy = linha.id_item && !linha.id_material;
          return <div className="material-row" key={field.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <select aria-label={`Material ${index + 1}`} value={linha.id_material || (isLegacy ? 'legado' : '')} onChange={e => selecionar(index, e.target.value)}>
              <option value="">Selecionar material</option>
              {isLegacy && <option value="legado">{linha.tipo_produto}</option>}
              {linha.id_material && !catalogo.some(m => String(m.id_material) === String(linha.id_material)) && <option value={linha.id_material}>{linha.tipo_produto} (arquivado)</option>}
              {catalogo.map(m => <option key={m.id_material} value={m.id_material}>{m.categoria} · {m.nome}</option>)}
            </select>
            <input aria-label={`Quantidade ${index + 1}`} {...register(`linhas.${index}.quantidade`)} type="number" min="1" max="10000000" step="1" placeholder="0" required={!!(linha.id_material || linha.id_item)} disabled={!linha.id_material && !linha.id_item} />
            <input aria-label={`Valor unitário ${index + 1}`} {...register(`linhas.${index}.valor_unitario`)} type="number" min="0" max="10000000" step="0.0001" placeholder="0,00" required={!!(linha.id_material || linha.id_item)} disabled={!linha.id_material && !linha.id_item} />
            <span>{decimal(Number(linha.quantidade || 0) * Number(linha.valor_unitario || 0))}</span>
          </div>
        })}</div><small>Subtotal de cada item = quantidade × valor unitário.</small>
        {!catalogo.length && <Feedback message="Nenhum material cadastrado. Peça ao administrador para preencher o catálogo em Papel." />}
      </section>
      <aside className="panel quote-summary"><h2>Resumo do orçamento</h2><p>Subtotal dos materiais</p><strong className="subtotal">{moeda(subtotal)}</strong><strong>Desconto no pedido</strong>
        <div className="discount-toggle">
          <Button variant="neutral" type="button" aria-pressed={watchDescontoTipo === 'percentual'} onClick={() => { setValue('desconto_tipo', 'percentual'); setValue('desconto_valor', '0'); }}>Percentual (%)</Button>
          <Button variant="neutral" type="button" aria-pressed={watchDescontoTipo === 'valor'} onClick={() => { setValue('desconto_tipo', 'valor'); setValue('desconto_valor', '0'); }}>Valor (R$)</Button>
        </div>
        <InputField label={`Desconto (${watchDescontoTipo === 'percentual' ? '%' : 'R$'})`} {...register('desconto_valor')} type="number" min="0" max={watchDescontoTipo === 'percentual' ? 100 : subtotal} step="0.01" />
        <small>O desconto será aplicado sobre o subtotal.</small><div className="quote-total"><small>TOTAL DO ORÇAMENTO</small><strong>{moeda(total)}</strong></div>
        <InputField label="Validade do orçamento" {...register('validade')} type="date" />
        
        {errors.root && <Feedback error={errors.root.message} />}
        {total < 0 && <Feedback error="O desconto não pode ultrapassar o subtotal." />}
        {mutation.error && <Feedback error={mensagemErro(mutation.error)} />}
        
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando...' : 'Salvar orçamento'}</Button>
      </aside>
    </form></>;
}
