const router = require("express").Router();
const auth = require("../controllers/AuthController");
const { autenticar, apenasAdmin } = require("../middlewares/AuthRole");
const db = require("../config/db");
const { id, HttpError, texto } = require("../utils/validation");
const { createLoginRateLimiter } = require("../middlewares/loginRateLimiter");
const { contaProtegida } = require("../utils/contaProtegida");
const loginRateLimiter = createLoginRateLimiter();

// Falha com 403 se o alvo for a conta administradora principal.
async function recusarContaProtegida(userId) {
  const { rows } = await db.query("SELECT login FROM usuario WHERE id_usuario = $1", [userId]);
  if (rows.length && contaProtegida(rows[0].login))
    throw new HttpError(403, "A conta administradora principal não pode ser alterada nem desativada.");
}
router.post("/login", loginRateLimiter, auth.login);
router.post("/register", loginRateLimiter, auth.registrar);
router.post("/logout", auth.logout);
router.post("/password", autenticar, auth.changePassword);
router.get("/me", autenticar, (req, res) => res.json({ usuario: req.usuario }));
router.get("/usuarios", autenticar, apenasAdmin, async (req, res) => {
  const { rows } = await db.query(
    "SELECT id_usuario, nome, login, tipo, ativo FROM usuario ORDER BY id_usuario DESC",
  );
  res.json(rows.map((u) => ({ ...u, protegido: contaProtegida(u.login) })));
});
router.patch("/usuarios/:id", autenticar, apenasAdmin, async (req, res) => {
  const userId = id(req.params.id);
  if (userId === req.usuario.id_usuario)
    throw new HttpError(
      409,
      "Não altere suas próprias permissões por esta tela.",
    );
  if (
    !["admin", "atendente"].includes(req.body.tipo) ||
    typeof req.body.ativo !== "boolean"
  )
    throw new HttpError(422, "Permissões inválidas.");
  await recusarContaProtegida(userId);
  const { rowCount } = await db.query(
    "UPDATE usuario SET tipo = $1, ativo = $2 WHERE id_usuario = $3",
    [req.body.tipo, req.body.ativo, userId],
  );
  if (!rowCount) throw new HttpError(404, "Usuário não encontrado.");
  res.json({ message: "Permissões atualizadas." });
});
router.patch("/usuarios/:id/senha", autenticar, apenasAdmin, async (req, res) => {
  const userId = id(req.params.id);
  if (userId === req.usuario.id_usuario) throw new HttpError(409, "Use a troca de senha da sua conta para atualizar sua própria senha.");
  const senha = texto(req.body.nova_senha, "Nova senha", 256, true);
  if (senha.length < 12) throw new HttpError(422, "A senha deve ter pelo menos 12 caracteres.");
  await recusarContaProtegida(userId);
  const { rowCount } = await db.query(
    "UPDATE usuario SET senha_hash = $1, token_version = token_version + 1 WHERE id_usuario = $2",
    [await auth.hashPassword(senha), userId],
  );
  if (!rowCount) throw new HttpError(404, "Usuário não encontrado.");
  res.json({ message: "Senha redefinida. As sessões anteriores foram encerradas." });
});
module.exports = router;
