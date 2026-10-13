import { useContext } from "react";
import { SessionContext } from "../../services/session.js";
import { mensagemErro } from "../../services/api.js";
import { Button, Feedback, Table, Spinner } from "../../components/ui";
import { PageHeader } from "../../components/layout";
import { useUsuarios, useSalvarUsuario } from "../../hooks/useUsuarios.js";

export default function Usuarios() {
  const { usuario } = useContext(SessionContext);

  const { data: users, isLoading, error: queryError } = useUsuarios();
  const mutation = useSalvarUsuario();

  const error = queryError
    ? mensagemErro(queryError)
    : mutation.error
      ? mensagemErro(mutation.error)
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
