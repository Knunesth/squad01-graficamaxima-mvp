import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X } from "lucide-react";
import { mensagemErro } from "@/shared/services/api.js";
import { Button, Feedback, InputField } from "@/shared/components/ui";
import { documentoBR, telefoneBR } from "@/shared/utils/format.js";
import { useSalvarCliente } from "@/features/customers/hooks/useCustomers.js";

const soDigitos = (valor) => String(valor || "").replace(/\D/g, "");

const schema = z.object({
  nome: z.string().trim().min(3, "Informe o nome com pelo menos 3 letras."),
  telefone: z
    .string()
    .refine((v) => soDigitos(v).length >= 10, "Informe o telefone com DDD."),
  email: z.string().trim().email("Informe um e-mail válido."),
  cpf_cnpj: z
    .string()
    .refine(
      (v) => [11, 14].includes(soDigitos(v).length),
      "O CPF tem 11 dígitos e o CNPJ tem 14.",
    ),
});

/**
 * Formulário de cliente, usado na tela Clientes e no fluxo de orçamento.
 * Salva pela API e devolve o cliente gravado em `onSalvo`.
 */
export function CustomerForm({ cliente, onSalvo, onCancelar, salvarLabel }) {
  const mutation = useSalvarCliente();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: cliente?.nome || "",
      telefone: telefoneBR(cliente?.telefone),
      email: cliente?.email || "",
      cpf_cnpj: documentoBR(cliente?.cpf_cnpj),
    },
  });

  const onSubmit = (dados) =>
    mutation.mutate(
      { id: cliente?.id_cliente, payload: dados },
      { onSuccess: (salvo) => onSalvo?.(salvo) },
    );

  return (
    <form className="form-grid" onSubmit={handleSubmit(onSubmit)} noValidate>
      <InputField
        className="span-2"
        label="Nome do cliente ou da empresa"
        {...register("nome")}
        error={errors.nome?.message}
        maxLength={100}
        autoComplete="name"
        placeholder="Nome completo ou razão social"
      />
      <Controller
        name="cpf_cnpj"
        control={control}
        render={({ field }) => (
          <InputField
            label="CPF ou CNPJ"
            {...field}
            onChange={(e) => field.onChange(documentoBR(e.target.value))}
            error={errors.cpf_cnpj?.message}
            inputMode="numeric"
            autoComplete="off"
            maxLength={18}
            placeholder="000.000.000-00"
          />
        )}
      />
      <Controller
        name="telefone"
        control={control}
        render={({ field }) => (
          <InputField
            label="Telefone"
            {...field}
            onChange={(e) => field.onChange(telefoneBR(e.target.value))}
            error={errors.telefone?.message}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={15}
            placeholder="(61) 99999-0000"
          />
        )}
      />
      <InputField
        className="span-2"
        label="E-mail"
        {...register("email")}
        error={errors.email?.message}
        type="email"
        autoComplete="email"
        maxLength={100}
        placeholder="contato@empresa.com.br"
      />
      {mutation.error && (
        <div className="span-2">
          <Feedback error={mensagemErro(mutation.error)} />
        </div>
      )}
      <div className="form-actions span-2">
        {onCancelar && (
          <Button variant="subtle" onClick={onCancelar} disabled={mutation.isPending}>
            <X size={18} aria-hidden="true" /> Cancelar
          </Button>
        )}
        <Button type="submit" loading={mutation.isPending}>
          <Save size={18} aria-hidden="true" />
          {mutation.isPending
            ? "Salvando..."
            : salvarLabel || (cliente?.id_cliente ? "Salvar alterações" : "Cadastrar cliente")}
        </Button>
      </div>
    </form>
  );
}
