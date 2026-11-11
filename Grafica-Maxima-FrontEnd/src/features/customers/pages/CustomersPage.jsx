import { useState } from "react";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { mensagemErro } from "@/shared/services/api.js";
import { Button, Modal } from "@/shared/components/ui";
import { PageHeader } from "@/shared/components/layout";
import { useToast } from "@/shared/hooks/useToast.js";
import { CustomerForm } from "@/features/customers/components/CustomerForm.jsx";
import { CustomerTable } from "@/features/customers/components/CustomerTable.jsx";
import { useExcluirCliente } from "@/features/customers/hooks/useCustomers.js";

export default function Clientes() {
  const toast = useToast();
  const excluirMutation = useExcluirCliente();
  // null = fechado · {} = novo cliente · {id_cliente, ...} = edição
  const [emEdicao, setEmEdicao] = useState(null);

  function excluir(cliente) {
    if (!window.confirm(`Excluir o cliente ${cliente.nome}?`)) return;
    excluirMutation.mutate(cliente.id_cliente, {
      onSuccess: () => toast.success(`Cliente ${cliente.nome} excluído.`),
      onError: (erro) => toast.error(mensagemErro(erro)),
    });
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Pessoas e empresas que recebem os orçamentos."
      >
        <Button onClick={() => setEmEdicao({})}>
          <UserPlus size={18} aria-hidden="true" /> Novo cliente
        </Button>
      </PageHeader>

      <section className="panel table-panel">
        <CustomerTable
          vazio="Nenhum cliente cadastrado ainda. Use o botão Novo cliente para começar."
          acoes={(cliente) => (
            <>
              <Button
                variant="subtle"
                onClick={() => setEmEdicao(cliente)}
                aria-label={`Editar ${cliente.nome}`}
              >
                <Pencil size={16} aria-hidden="true" /> Editar
              </Button>
              <Button
                variant="subtle"
                className="text-danger"
                disabled={excluirMutation.isPending}
                onClick={() => excluir(cliente)}
                aria-label={`Excluir ${cliente.nome}`}
              >
                <Trash2 size={16} aria-hidden="true" /> Excluir
              </Button>
            </>
          )}
        />
      </section>

      {emEdicao && (
        <Modal
          title={emEdicao.id_cliente ? "Editar cliente" : "Novo cliente"}
          description="Todos os campos são obrigatórios."
          onClose={() => setEmEdicao(null)}
        >
          <CustomerForm
            cliente={emEdicao}
            onCancelar={() => setEmEdicao(null)}
            onSalvo={(salvo) => {
              toast.success(
                emEdicao.id_cliente
                  ? `Cliente ${salvo.nome} atualizado.`
                  : `Cliente ${salvo.nome} cadastrado.`,
              );
              setEmEdicao(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
