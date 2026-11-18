import { useContext, useState } from "react";
import { Ban, Check, KeyRound, ShieldCheck } from "lucide-react";
import { SessionContext } from "@/app/SessionContext.js";
import { mensagemErro } from "@/shared/services/api.js";
import {
  Badge,
  Button,
  Feedback,
  Modal,
  PasswordField,
  PasswordStrength,
  Spinner,
  Table,
} from "@/shared/components/ui";
import { PageHeader } from "@/shared/components/layout";
import { useToast } from "@/shared/hooks/useToast.js";
import { avaliarSenha } from "@/shared/utils/password.js";
import {
  useUsuarios,
  useSalvarUsuario,
  useRedefinirSenha,
} from "@/features/users/hooks/useUsers.js";

const PERFIS = { atendente: "Atendente", admin: "Administrador" };

function RedefinirSenhaModal({ conta, fechar }) {
  const toast = useToast();
  const mutation = useRedefinirSenha();
  const [senha, setSenha] = useState("");
  const { valida } = avaliarSenha(senha, conta.login || "");

  function enviar(event) {
    event.preventDefault();
    if (!valida) return;
    mutation.mutate(
      { id_usuario: conta.id_usuario, nova_senha: senha },
      {
        onSuccess: () => {
          toast.success(`Senha de ${conta.login} redefinida. As sessões dela foram encerradas.`);
          fechar();
        },
      },
    );
  }

  return (
    <Modal
      title={`Redefinir senha de ${conta.login}`}
      description="A pessoa será desconectada e entra de novo com a senha nova. Combine a senha com ela por um canal seguro."
      onClose={fechar}
    >
      <form className="form-grid" onSubmit={enviar} noValidate>
        <div className="span-2">
          <PasswordField
            label="Nova senha"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            autoComplete="new-password"
            maxLength={256}
            autoFocus
          >
            <PasswordStrength senha={senha} login={conta.login || ""} />
          </PasswordField>
        </div>
        {mutation.error && (
          <div className="span-2">
            <Feedback error={mensagemErro(mutation.error)} />
          </div>
        )}
        <div className="form-actions span-2">
          <Button variant="subtle" onClick={fechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!valida} loading={mutation.isPending}>
            <KeyRound size={18} aria-hidden="true" /> Redefinir senha
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Usuarios() {
  const { usuario } = useContext(SessionContext);
  const toast = useToast();
  const [redefinindo, setRedefinindo] = useState(null);

  const { data: users, isLoading, error: queryError } = useUsuarios();
  const mutation = useSalvarUsuario();

  const error = queryError ? mensagemErro(queryError) : mutation.error ? mensagemErro(mutation.error) : "";

  function salvar(conta, tipo, ativo, aviso) {
    mutation.mutate(
      { id_usuario: conta.id_usuario, tipo, ativo },
      { onSuccess: () => toast.success(aviso) },
    );
  }

  // Contas sem acesso primeiro, porque são as que pedem uma ação.
  const ordenadas = users
    ? [...users].sort((a, b) => Number(!!a.ativo) - Number(!!b.ativo))
    : [];
  const semAcesso = ordenadas.filter((u) => !u.ativo).length;

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Libere contas novas e escolha o que cada pessoa pode fazer."
        back="/"
      />
      <Feedback error={error} />
      {isLoading ? (
        <div className="panel" style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
          <Spinner /> <span style={{ marginLeft: "1rem" }}>Carregando usuários...</span>
        </div>
      ) : users ? (
        <>
          <div className="user-summary" role="status">
            <span className="summary-chip">
              <strong>{users.length}</strong> {users.length === 1 ? "conta" : "contas"}
            </span>
            {semAcesso > 0 && (
              <span className="summary-chip summary-chip-alert">
                <strong>{semAcesso}</strong> aguardando liberação
              </span>
            )}
          </div>
          <div className="panel">
            <Table caption="Usuários, perfil e situação de acesso">
              <thead>
                <tr>
                  <th scope="col">Usuário</th>
                  <th scope="col">Perfil</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((u) => {
                  const nome = u.login || u.nome;
                  const propria = u.id_usuario === usuario.id_usuario;
                  const travada = propria || !!u.protegido;
                  return (
                    <tr key={u.id_usuario} className={!u.ativo ? "user-row-pending" : undefined}>
                      <td>
                        <div className="user-cell">
                          <span className="user-avatar" aria-hidden="true">
                            {nome.charAt(0).toUpperCase()}
                          </span>
                          <div className="user-meta">
                            <strong>{nome}</strong>
                            {u.protegido ? (
                              <small>
                                <ShieldCheck size={14} aria-hidden="true" /> Conta principal: não pode ser alterada nem desativada.
                              </small>
                            ) : propria ? (
                              <small>Você</small>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="user-role"
                          aria-label={`Perfil de ${nome}`}
                          value={u.tipo}
                          disabled={mutation.isPending || travada}
                          onChange={(e) =>
                            salvar(u, e.target.value, !!u.ativo, `Perfil de ${nome} alterado para ${PERFIS[e.target.value]}.`)
                          }
                        >
                          <option value="atendente">{PERFIS.atendente}</option>
                          <option value="admin">{PERFIS.admin}</option>
                        </select>
                      </td>
                      <td>
                        <Badge variant={u.ativo ? "success" : "warning"}>
                          {u.ativo ? "Ativo" : "Aguardando liberação"}
                        </Badge>
                      </td>
                      <td>
                        <div className="user-actions">
                          <Button
                            variant={u.ativo ? "neutral" : "primary"}
                            disabled={mutation.isPending || travada}
                            aria-label={`${u.ativo ? "Desativar" : "Liberar acesso de"} ${nome}`}
                            onClick={() =>
                              salvar(
                                u,
                                u.tipo,
                                !u.ativo,
                                u.ativo ? `Acesso de ${nome} desativado.` : `Acesso de ${nome} liberado.`,
                              )
                            }
                          >
                            {u.ativo ? (
                              <><Ban size={16} aria-hidden="true" /> Desativar</>
                            ) : (
                              <><Check size={16} aria-hidden="true" /> Liberar acesso</>
                            )}
                          </Button>
                          {!travada && (
                            <Button
                              variant="subtle"
                              onClick={() => setRedefinindo(u)}
                              aria-label={`Redefinir senha de ${nome}`}
                            >
                              <KeyRound size={16} aria-hidden="true" /> Redefinir senha
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </>
      ) : null}
      {redefinindo && <RedefinirSenhaModal conta={redefinindo} fechar={() => setRedefinindo(null)} />}
    </>
  );
}
