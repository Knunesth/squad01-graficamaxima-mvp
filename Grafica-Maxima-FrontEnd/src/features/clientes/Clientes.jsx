import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { mensagemErro } from '../../services/api.js';
import { Button, Feedback, InputField, Spinner, Table } from '../../components/ui';
import { PageHeader } from '../../components/layout';

const vazio = { nome: '', telefone: '', email: '', cpf_cnpj: '' };

export default function Clientes() {
  const queryClient = useQueryClient();
  const { data: clientes, isLoading, error: loadError } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => (await api.get('/api/clientes')).data,
  });
  const [selecionado, setSelecionado] = useState(null);
  const [form, setForm] = useState(vazio);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function editar(cliente) {
    setSelecionado(cliente.id_cliente);
    setForm({ nome: cliente.nome, telefone: cliente.telefone, email: cliente.email, cpf_cnpj: cliente.cpf_cnpj });
    setError('');
    setMessage('');
  }

  function novo() {
    setSelecionado(null);
    setForm(vazio);
    setError('');
    setMessage('');
  }

  async function salvar(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (selecionado) await api.put(`/api/clientes/${selecionado}`, form);
      else await api.post('/api/clientes', form);
      await queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setMessage(selecionado ? 'Cliente atualizado.' : 'Cliente cadastrado.');
      setSelecionado(null);
      setForm(vazio);
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }

  async function excluir(cliente) {
    if (!window.confirm(`Excluir o cliente ${cliente.nome}?`)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.delete(`/api/clientes/${cliente.id_cliente}`);
      await queryClient.invalidateQueries({ queryKey: ['clientes'] });
      if (selecionado === cliente.id_cliente) novo();
      setMessage('Cliente excluído.');
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Clientes" subtitle="Cadastros vinculados aos orçamentos." />
      <Feedback error={error || (loadError && mensagemErro(loadError))} message={message} />
      <section className="panel">
        <h2>{selecionado ? 'Editar cliente' : 'Novo cliente'}</h2>
        <form onSubmit={salvar}>
          {Object.entries({ nome: 'Nome', telefone: 'Telefone', email: 'E-mail', cpf_cnpj: 'CPF ou CNPJ' }).map(([key, label]) => (
            <InputField
              key={key}
              label={label}
              name={key}
              value={form[key]}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              type={key === 'email' ? 'email' : 'text'}
              maxLength={key === 'nome' || key === 'email' ? 100 : 20}
              required
            />
          ))}
          <Button type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar'}</Button>{' '}
          {selecionado && <Button type="button" variant="neutral" onClick={novo}>Cancelar</Button>}
        </form>
      </section>
      <section className="panel">
        <h2>Clientes cadastrados</h2>
        {isLoading ? <p role="status"><Spinner /> Carregando clientes...</p> : (
          <Table empty={!clientes?.length} emptyMessage="Nenhum cliente cadastrado.">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Ações</th></tr></thead>
            <tbody>{clientes?.map((cliente) => (
              <tr key={cliente.id_cliente}>
                <td>{cliente.nome}</td><td>{cliente.email}</td><td>{cliente.telefone}</td>
                <td>
                  <Button variant="subtle" disabled={busy} onClick={() => editar(cliente)}>Editar</Button>{' '}
                  <Button variant="subtle" disabled={busy} onClick={() => excluir(cliente)}>Excluir</Button>
                </td>
              </tr>
            ))}</tbody>
          </Table>
        )}
      </section>
    </>
  );
}
