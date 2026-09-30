import { useContext, useState } from 'react';
import { SessionContext } from '../services/session';
import { mensagemErro } from '../services/api';
import { Button, Feedback, Spinner } from '../components/ui';
import { PageHeader } from '../components/layout';
import { useTiposCalculo, useSalvarTipoCalculo } from '../hooks/useConfiguracao';

export default function Configuracao() {
  const { usuario } = useContext(SessionContext);
  
  const { data: precos, isLoading, error: queryError } = useTiposCalculo();
  const mutation = useSalvarTipoCalculo();

  const [message, setMessage] = useState('');
  
  const error = queryError ? mensagemErro(queryError) : mutation.error ? mensagemErro(mutation.error) : '';

  async function salvar(event, tipo) { 
    event.preventDefault(); 
    setMessage(''); 
    const form = new FormData(event.currentTarget); 
    mutation.mutate({ tipo, preco_base_m2: form.get('preco') }, {
      onSuccess: () => setMessage('Preço atualizado.')
    });
  }

  return <><PageHeader title="Configurações" subtitle="Preços por metro quadrado. Papéis e acabamentos estão no catálogo Papel." back="/papel" /><Feedback error={error} message={message} />
    {isLoading ? <div className="panel" style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner /> <span style={{marginLeft: '1rem'}}>Carregando configurações...</span></div> : precos ? <section className="panel price-settings">
      {precos.map(p => <form key={p.tipo} onSubmit={e => salvar(e,p.tipo)}>
        <label htmlFor={`preco-${p.tipo}`}>{p.tipo.replaceAll('_',' ')}</label>
        <input id={`preco-${p.tipo}`} name="preco" type="number" min="0.0001" step="0.0001" required defaultValue={p.preco_base_m2} disabled={usuario.tipo !== 'admin'} />
        {usuario.tipo === 'admin' && <Button type="submit" disabled={mutation.isPending}>{mutation.isPending && mutation.variables?.tipo === p.tipo ? 'Salvando...' : 'Salvar'}</Button>}
      </form>)}
    </section> : null}
  </>;
}
