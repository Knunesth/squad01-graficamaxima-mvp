import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { ChartColumn, KeyRound, Layers3, Save, Users } from "lucide-react";
import { SessionContext } from "@/app/SessionContext.js";
import { mensagemErro } from "@/shared/services/api.js";
import { Button, Feedback, InputField, NumericInput, Spinner } from "@/shared/components/ui";
import { PageHeader } from "@/shared/components/layout";
import { useToast } from "@/shared/hooks/useToast.js";
import { moeda } from "@/shared/utils/format.js";
import {
  useTiposCalculo,
  useSalvarTipoCalculo,
} from "@/features/settings/hooks/useSettings.js";
import { useTrocarSenha } from "@/features/users/hooks/useUsers.js";

function PrecoM2({ preco, podeEditar }) {
  const toast = useToast();
  const mutation = useSalvarTipoCalculo();
  const [valor, setValor] = useState(Number(preco.preco_base_m2));
  const nome = preco.tipo.replaceAll("_", " ");
  const alterado = valor !== "" && Number(valor) !== Number(preco.preco_base_m2);

  if (!podeEditar)
    return (
      <li>
        <div className="price-list-readonly">
          <span>{nome}</span> <strong>{moeda(preco.preco_base_m2)}</strong>
        </div>
      </li>
    );

  return (
    <li>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!valor) return toast.error("Informe um preço maior que zero.");
          mutation.mutate(
            { tipo: preco.tipo, preco_base_m2: valor },
            {
              onSuccess: () => toast.success(`Preço de ${nome} atualizado para ${moeda(valor)} por m².`),
              onError: (erro) => toast.error(mensagemErro(erro)),
            },
          );
        }}
      >
        <label htmlFor={`preco-${preco.tipo}`}>{nome}</label>
        <NumericInput
          id={`preco-${preco.tipo}`}
          prefix="R$"
          decimals={4}
          max={1000000}
          value={valor}
          onChange={setValor}
        />
        <Button type="submit" variant="neutral" disabled={!alterado} loading={mutation.isPending}>
          <Save size={16} aria-hidden="true" /> Salvar
        </Button>
      </form>
    </li>
  );
}

export default function Configuracao() {
  const { usuario } = useContext(SessionContext);
  const toast = useToast();
  const admin = usuario.tipo === "admin";
  const { data: precos, isLoading, error } = useTiposCalculo();
  const senha = useTrocarSenha();

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Sua conta, sua senha e os preços usados na calculadora."
        action={false}
      />
      <div className="settings">
        <section className="settings-section" aria-labelledby="conta-titulo">
          <header>
            <h2 id="conta-titulo">Minha conta</h2>
            <p>Dados de acesso em uso nesta sessão.</p>
          </header>
          <dl className="account-facts">
            <div>
              <dt>Nome</dt>
              <dd>{usuario.nome}</dd>
            </div>
            <div>
              <dt>Login</dt>
              <dd>{usuario.login}</dd>
            </div>
            <div>
              <dt>Perfil</dt>
              <dd>{admin ? "Administrador" : "Atendente"}</dd>
            </div>
          </dl>
        </section>

        <section className="settings-section" aria-labelledby="senha-titulo">
          <header>
            <h2 id="senha-titulo">Senha</h2>
            <p>Ao trocar a senha, você sai de todos os dispositivos e entra de novo com a senha nova.</p>
          </header>
          <form
            className="settings-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              senha.mutate(
                { senha_atual: form.get("senha_atual"), nova_senha: form.get("nova_senha") },
                {
                  onSuccess: () => {
                    toast.success("Senha alterada. Entre novamente com a senha nova.");
                    window.dispatchEvent(new Event("session-expired"));
                  },
                },
              );
            }}
          >
            <InputField label="Senha atual" name="senha_atual" type="password" autoComplete="current-password" required />
            <InputField
              label="Nova senha (mínimo de 12 caracteres)"
              name="nova_senha"
              type="password"
              minLength={12}
              maxLength={256}
              autoComplete="new-password"
              required
            />
            <Feedback error={senha.error ? mensagemErro(senha.error) : ""} />
            <div className="form-actions">
              <Button type="submit" loading={senha.isPending}>
                <KeyRound size={18} aria-hidden="true" /> {senha.isPending ? "Salvando..." : "Alterar senha"}
              </Button>
            </div>
          </form>
        </section>

        <section className="settings-section" aria-labelledby="precos-titulo">
          <header>
            <h2 id="precos-titulo">Preços por m²</h2>
            <p>
              Valor base de cada serviço na calculadora de m².
              {!admin && " Somente administradores podem alterar."}
            </p>
          </header>
          <div>
            <Feedback error={error ? mensagemErro(error) : ""} />
            {isLoading ? (
              <p className="loading-line" role="status">
                <Spinner /> Carregando preços...
              </p>
            ) : precos?.length ? (
              <ul className="price-list">
                {precos.map((preco) => (
                  <PrecoM2 key={preco.tipo} preco={preco} podeEditar={admin} />
                ))}
              </ul>
            ) : (
              !error && <p className="hint">Nenhum tipo de serviço cadastrado.</p>
            )}
          </div>
        </section>

        {admin && (
          <section className="settings-section" aria-labelledby="admin-titulo">
            <header>
              <h2 id="admin-titulo">Administração</h2>
              <p>Outras áreas que só administradores acessam.</p>
            </header>
            <div className="shortcut-list">
              <Link className="button button-neutral" to="/usuarios">
                <Users size={18} aria-hidden="true" /> Usuários e permissões
              </Link>
              <Link className="button button-neutral" to="/papel">
                <Layers3 size={18} aria-hidden="true" /> Catálogo de papel
              </Link>
              <Link className="button button-neutral" to="/relatorios">
                <ChartColumn size={18} aria-hidden="true" /> Relatórios
              </Link>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
