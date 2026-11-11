import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { mensagemErro } from "@/shared/services/api.js";
import { Feedback, Table } from "@/shared/components/ui";
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

  return (
    <div className="customer-table">
      <div className="search-field">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar cliente"
          placeholder="Buscar por nome, e-mail, CPF/CNPJ ou telefone"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
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
          {filtrados.map((cliente) => (
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
    </div>
  );
}
