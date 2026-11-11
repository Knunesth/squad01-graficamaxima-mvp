import { useContext } from "react";
import { KeyRound, UserCheck, UserX } from "lucide-react";
import { SessionContext } from "@/app/SessionContext.js";
import { mensagemErro } from "@/shared/services/api.js";
import { Badge, Button, Feedback, InputField, Table, Spinner } from "@/shared/components/ui";
import { PageHeader } from "@/shared/components/layout";
import { useToast } from "@/shared/hooks/useToast.js";
import {
  useUsuarios,
  useSalvarUsuario,
  useRedefinirSenha,
} from "@/features/users/hooks/useUsers.js";

export default function Usuarios() {
  const { usuario } = useContext(SessionContext);
  const toast = useToast();

  const { data: users, isLoading, error: queryError } = useUsuarios();
  const mutation = useSalvarUsuario();
  const resetMutation = useRedefinirSenha();

  async function salvar(u, tipo, ativo) {
    mutation.mutate({ id_usuario: u.id_usuario, tipo, ativo }, {
      onSuccess: () => toast.success(`Usuário ${u.login || u.nome} atualizado.`),
      onError: (erro) => toast.error(mensagemErro(erro)),
    });
  }

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Libere contas e gerencie as permissões de acesso."
        back="/"
      />
      <Feedback error={queryError ? mensagemErro(queryError) : ""} />
      {isLoading ? (
        <div className="panel loading-line" role="status">
          <Spinner /> <span>Carregando usuários...</span>
        </div>
      ) : users ? (
        <div className="panel">
          <Table caption="Usuários, perfil e estado de acesso">
            <thead>
              <tr>
                <th scope="col">Login</th>
                <th scope="col">Perfil</th>
                <th scope="col">Acesso</th>
                <th scope="col">Ações</th>
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
                    <Badge variant={u.ativo ? "success" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td>
                    <div className="row-actions"><Button
                      variant="neutral"
                      disabled={
                        mutation.isPending ||
                        u.id_usuario === usuario.id_usuario
                      }
                      onClick={() => salvar(u, u.tipo, !u.ativo)}
                    >
                      {u.ativo ? <UserX size={16} aria-hidden="true" /> : <UserCheck size={16} aria-hidden="true" />}
                      {u.ativo ? "Desativar" : "Liberar acesso"}
                    </Button></div>
                    {u.id_usuario !== usuario.id_usuario && (
                      <details>
                        <summary>Redefinir senha</summary>
                        <form onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          const nova_senha = form.get("nova_senha");
                          event.currentTarget.reset();
                          resetMutation.mutate({ id_usuario: u.id_usuario, nova_senha }, {
                            onSuccess: () => toast.success(`Senha de ${u.login || u.nome} redefinida.`),
                            onError: (erro) => toast.error(mensagemErro(erro)),
                          });
                        }}>
                          <InputField id={`nova-senha-${u.id_usuario}`} label="Nova senha (mínimo 12 caracteres)" name="nova_senha" type="password" minLength={12} maxLength={256} autoComplete="new-password" required />
                          <div className="form-actions"><Button type="submit" disabled={resetMutation.isPending}><KeyRound size={16} aria-hidden="true" /> Redefinir senha</Button></div>
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
