import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { mensagemErro } from "@/shared/services/api.js";
import { Button, Feedback, Table } from "@/shared/components/ui";
import { documentoBR, telefoneBR } from "@/shared/utils/format.js";
import { useClientes } from "@/features/customers/hooks/useCustomers.js";

const semAcento = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Lista de clientes com busca instantânea. `acoes(cliente)` devolve os botões
 * da última coluna (selecionar, editar, excluir...).
 */
export function CustomerTable({ acoes, colunaAcoes = "Ações", vazio }) {
  const { data: clientes, isLoading, error } = useClientes();
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);

  const filtrados = useMemo(() => {
    const termo = semAcento(busca.trim());
    if (!termo) return clientes || [];
    const digitos = termo.replace(/\D/g, "");
    return (clientes || []).filter(
      (c) =>
        semAcento(c.nome).includes(termo) ||
        semAcento(c.email).includes(termo) ||
        (digitos && String(c.cpf_cnpj || "").includes(digitos)) ||
        (digitos && String(c.telefone || "").replace(/\D/g, "").includes(digitos)),
    );
  }, [clientes, busca]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / 20));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * 20, paginaAtual * 20);

  return (
    <div className="customer-table">
      <div className="search-field">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar cliente"
          placeholder="Buscar por nome, e-mail, CPF/CNPJ ou telefone"
          value={busca}
          onChange={(event) => { setBusca(event.target.value); setPagina(1); }}
        />
        <small role="status">
          {isLoading
            ? "Carregando..."
            : `${filtrados.length} de ${clientes?.length || 0} clientes`}
        </small>
      </div>
      <Feedback error={error ? mensagemErro(error) : ""} />
      <Table
        caption="Clientes cadastrados: nome, documento, e-mail e telefone"
        loading={isLoading}
        empty={!isLoading && !filtrados.length}
        emptyMessage={
          clientes?.length
            ? "Nenhum cliente corresponde à busca."
            : vazio || "Nenhum cliente cadastrado ainda."
        }
      >
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">CPF ou CNPJ</th>
            <th scope="col">E-mail</th>
            <th scope="col">Telefone</th>
            <th scope="col" className="cell-actions">{colunaAcoes}</th>
          </tr>
        </thead>
        <tbody>
          {visiveis.map((cliente) => (
            <tr key={cliente.id_cliente}>
              <td><strong>{cliente.nome}</strong></td>
              <td className="cell-number">{documentoBR(cliente.cpf_cnpj) || "—"}</td>
              <td>{cliente.email || "—"}</td>
              <td className="cell-number">{telefoneBR(cliente.telefone) || cliente.telefone || "—"}</td>
              <td className="cell-actions">
                <div className="row-actions">{acoes(cliente)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {filtrados.length > 20 && <div className="pagination">
        <small role="status">{(paginaAtual - 1) * 20 + 1}–{Math.min(paginaAtual * 20, filtrados.length)} de {filtrados.length} clientes</small>
        <Button variant="subtle" disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}><ChevronLeft size={18} aria-hidden="true" /> Anterior</Button>
        <span>Página {paginaAtual} de {totalPaginas}</span>
        <Button variant="subtle" disabled={paginaAtual === totalPaginas} onClick={() => setPagina(paginaAtual + 1)}><ChevronRight size={18} aria-hidden="true" /> Próxima</Button>
      </div>}
    </div>
  );
}
