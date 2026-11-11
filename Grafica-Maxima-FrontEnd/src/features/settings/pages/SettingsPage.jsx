import { useContext, useState } from "react";
import { SessionContext } from "@/app/SessionContext.js";
import { mensagemErro } from "@/shared/services/api.js";
import { Button, Feedback, Spinner } from "@/shared/components/ui";
import { PageHeader } from "@/shared/components/layout";
import {
  useTiposCalculo,
  useSalvarTipoCalculo,
} from "@/features/settings/hooks/useSettings.js";
import { useTrocarSenha } from "@/features/users/hooks/useUsers.js";

export default function Configuracao() {
  const { usuario } = useContext(SessionContext);

  const { data: precos, isLoading, error: queryError } = useTiposCalculo();
  const mutation = useSalvarTipoCalculo();
  const passwordMutation = useTrocarSenha();

  const [message, setMessage] = useState("");

  const error = queryError
    ? mensagemErro(queryError)
    : mutation.error
      ? mensagemErro(mutation.error)
      : "";

  async function salvar(event, tipo) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    mutation.mutate(
      { tipo, preco_base_m2: form.get("preco") },
      {
        onSuccess: () => setMessage("Preço atualizado."),
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Preços por metro quadrado. Papéis e acabamentos estão no catálogo Papel."
        back="/papel"
      />
      <Feedback error={error} message={message} />
      {isLoading ? (
        <div
          className="panel"
          style={{ display: "flex", justifyContent: "center", padding: "2rem" }}
        >
          <Spinner />{" "}
          <span style={{ marginLeft: "1rem" }}>
            Carregando configurações...
          </span>
        </div>
      ) : precos ? (
        <section className="panel price-settings">
          {precos.map((p) => (
            <form key={p.tipo} onSubmit={(e) => salvar(e, p.tipo)}>
              <label htmlFor={`preco-${p.tipo}`}>
                {p.tipo.replaceAll("_", " ")}
              </label>
              <input
                id={`preco-${p.tipo}`}
                name="preco"
                type="number"
                min="0.0001"
                step="0.0001"
                required
                defaultValue={p.preco_base_m2}
                disabled={usuario.tipo !== "admin"}
              />
              {usuario.tipo === "admin" && (
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && mutation.variables?.tipo === p.tipo
                    ? "Salvando..."
                    : "Salvar"}
                </Button>
              )}
            </form>
          ))}
        </section>
      ) : null}
      <section className="panel" aria-labelledby="password-heading">
        <h2 id="password-heading">Alterar minha senha</h2>
        <form onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          passwordMutation.mutate({ senha_atual: form.get("senha_atual"), nova_senha: form.get("nova_senha") }, {
            onSuccess: () => window.dispatchEvent(new Event("session-expired")),
          });
        }}>
          <label htmlFor="senha-atual">Senha atual</label>
          <input id="senha-atual" name="senha_atual" type="password" autoComplete="current-password" required />
          <label htmlFor="senha-nova">Nova senha (mínimo 12 caracteres)</label>
          <input id="senha-nova" name="nova_senha" type="password" minLength={12} maxLength={256} autoComplete="new-password" required />
          <Feedback error={passwordMutation.error ? mensagemErro(passwordMutation.error) : ""} />
          <Button type="submit" disabled={passwordMutation.isPending}>{passwordMutation.isPending ? "Salvando..." : "Alterar senha"}</Button>
        </form>
      </section>
    </>
  );
}
