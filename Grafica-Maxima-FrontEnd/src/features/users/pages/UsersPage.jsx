import { useContext } from "react";
import { SessionContext } from "@/app/SessionContext.js";
import { mensagemErro } from "@/shared/services/api.js";
import { Button, Feedback, Table, Spinner } from "@/shared/components/ui";
import { PageHeader } from "@/shared/components/layout";
import {
  useUsuarios,
  useSalvarUsuario,
  useRedefinirSenha,
} from "@/features/users/hooks/useUsers.js";

export default function Usuarios() {
  const { usuario } = useContext(SessionContext);

  const { data: users, isLoading, error: queryError } = useUsuarios();
  const mutation = useSalvarUsuario();
  const resetMutation = useRedefinirSenha();

  const error = queryError
    ? mensagemErro(queryError)
    : mutation.error
      ? mensagemErro(mutation.error)
      : resetMutation.error
        ? mensagemErro(resetMutation.error)
      : "";

  async function salvar(u, tipo, ativo) {
    mutation.mutate({ id_usuario: u.id_usuario, tipo, ativo });
  }

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Libere contas e gerencie as permissões de acesso."
        back="/"
      />
      <Feedback error={error} />
      {isLoading ? (
        <div
          className="panel"
          style={{ display: "flex", justifyContent: "center", padding: "2rem" }}
        >
          <Spinner />{" "}
          <span style={{ marginLeft: "1rem" }}>Carregando usuários...</span>
        </div>
      ) : users ? (
        <div className="panel">
          <Table>
            <thead>
              <tr>
                <th>Login</th>
                <th>Perfil</th>
                <th>Acesso</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.login || u.nome}</td>
                  <td>
                    <select
                      aria-label={`Perfil de ${u.login || u.nome}`}
                      value={u.tipo}
                      disabled={
                        mutation.isPending ||
                        u.id_usuario === usuario.id_usuario
                      }
                      onChange={(e) => salvar(u, e.target.value, !!u.ativo)}
                    >
                      <option value="atendente">Atendente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td>
                    <Button
                      variant="neutral"
                      disabled={
                        mutation.isPending ||
                        u.id_usuario === usuario.id_usuario
                      }
                      onClick={() => salvar(u, u.tipo, !u.ativo)}
                    >
                      {u.ativo ? "Desativar" : "Liberar acesso"}
                    </Button>
                    {u.id_usuario !== usuario.id_usuario && (
                      <details>
                        <summary>Redefinir senha</summary>
                        <form onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          const nova_senha = form.get("nova_senha");
                          event.currentTarget.reset();
                          resetMutation.mutate({ id_usuario: u.id_usuario, nova_senha });
                        }}>
                          <label htmlFor={`nova-senha-${u.id_usuario}`}>Nova senha (mínimo 12 caracteres)</label>
                          <input id={`nova-senha-${u.id_usuario}`} name="nova_senha" type="password" minLength={12} maxLength={256} autoComplete="new-password" required />
                          <Button type="submit" disabled={resetMutation.isPending}>Confirmar redefinição</Button>
                        </form>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : null}
    </>
  );
}
