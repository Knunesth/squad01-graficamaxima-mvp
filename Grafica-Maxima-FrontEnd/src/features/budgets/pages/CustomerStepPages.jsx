import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, UserPlus } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { PageHeader } from "@/shared/components/layout";
import { useToast } from "@/shared/hooks/useToast.js";
import { CustomerForm } from "@/features/customers/components/CustomerForm.jsx";
import { CustomerTable } from "@/features/customers/components/CustomerTable.jsx";
import {
  guardarClienteDoOrcamento,
  limparClienteDoOrcamento,
} from "@/features/budgets/quoteCustomer.js";

function Etapas({ atual }) {
  return (
    <ol className="steps" aria-label="Etapas do novo orçamento">
      <li aria-current={atual === 1 ? "step" : undefined}>
        <span>1</span> Cliente
      </li>
      <li aria-current={atual === 2 ? "step" : undefined}>
        <span>2</span> Materiais e valores
      </li>
    </ol>
  );
}

export function EscolherCliente() {
  const navigate = useNavigate();

  function selecionar(cliente) {
    guardarClienteDoOrcamento(cliente);
    navigate("/orcamentos/novo/producao");
  }

  return (
    <>
      <PageHeader
        title="Novo orçamento"
        subtitle="Escolha para quem é o orçamento. O cliente é opcional e pode ser trocado depois."
        back="/orcamentos"
      />
      <Etapas atual={1} />
      <div className="toolbar">
        <Link
          className="button button-neutral"
          to="/orcamentos/novo/producao"
          onClick={limparClienteDoOrcamento}
        >
          Continuar sem cliente <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link className="button button-subtle" to="/orcamentos/novo/cadastro">
          <UserPlus size={18} aria-hidden="true" /> Cadastrar novo cliente
        </Link>
      </div>
      <section className="panel table-panel" aria-labelledby="clientes-disponiveis">
        <h2 id="clientes-disponiveis" className="panel-title">
          Clientes cadastrados
        </h2>
        <CustomerTable
          colunaAcoes="Selecionar"
          vazio="Nenhum cliente cadastrado ainda. Cadastre um novo ou continue sem cliente."
          acoes={(cliente) => (
            <Button
              variant="neutral"
              onClick={() => selecionar(cliente)}
              aria-label={`Selecionar ${cliente.nome}`}
            >
              <Check size={16} aria-hidden="true" /> Selecionar
            </Button>
          )}
        />
      </section>
    </>
  );
}

export function CadastrarCliente() {
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <>
      <PageHeader
        title="Cadastrar cliente"
        subtitle="Depois de salvar, você segue direto para os materiais do orçamento."
        back="/orcamentos/novo"
      />
      <Etapas atual={1} />
      <section className="form-plain" aria-label="Dados do novo cliente">
        <CustomerForm
          salvarLabel="Cadastrar e continuar"
          onCancelar={() => navigate("/orcamentos/novo")}
          onSalvo={(cliente) => {
            guardarClienteDoOrcamento(cliente);
            toast.success(`Cliente ${cliente.nome} cadastrado.`);
            navigate("/orcamentos/novo/producao");
          }}
        />
      </section>
    </>
  );
}
