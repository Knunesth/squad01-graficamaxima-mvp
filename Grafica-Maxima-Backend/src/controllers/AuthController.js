const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { HttpError, texto } = require("../utils/validation");
const { hashPassword, verifyPassword } = require("../services/password");
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 8 * 60 * 60 * 1000,
});
async function login(req, res) {
  const login = texto(
    req.body.login || req.body.email,
    "Login",
    100,
    true,
  ).toLowerCase();
  const senha = texto(req.body.senha, "Senha", 256, true);
  const { rows } = await db.query(
    "SELECT id_usuario, nome, login, tipo, ativo, senha_hash, token_version FROM usuario WHERE login = $1 OR email = $2 LIMIT 1",
    [login, login],
  );
  const user = rows[0];
  const valid = await verifyPassword(senha, user?.senha_hash);
  if (!valid || !user?.ativo)
    throw new HttpError(
      401,
      "Login ou senha inválidos, ou conta ainda não liberada.",
    );
  const token = jwt.sign(
    { sub: String(user.id_usuario), ver: user.token_version },
    process.env.JWT_SECRET,
    { expiresIn: "8h", algorithm: "HS256" },
  );
  res.cookie("grafica_session", token, cookieOptions());
  res.json({
    usuario: {
      id_usuario: user.id_usuario,
      nome: user.nome,
      login: user.login,
      tipo: user.tipo,
    },
  });
}
async function changePassword(req, res) {
  const currentPassword = texto(req.body.senha_atual, "Senha atual", 256, true);
  const newPassword = texto(req.body.nova_senha, "Nova senha", 256, true);
  if (newPassword.length < 12) throw new HttpError(422, "A nova senha deve ter pelo menos 12 caracteres.");
  const { rows } = await db.query("SELECT senha_hash FROM usuario WHERE id_usuario = $1", [req.usuario.id_usuario]);
  if (!rows.length || !(await verifyPassword(currentPassword, rows[0].senha_hash))) throw new HttpError(401, "Senha atual inválida.");
  if (await verifyPassword(newPassword, rows[0].senha_hash)) throw new HttpError(422, "Escolha uma senha diferente da atual.");
  await db.query("UPDATE usuario SET senha_hash = $1, token_version = token_version + 1 WHERE id_usuario = $2", [await hashPassword(newPassword), req.usuario.id_usuario]);
  res.clearCookie("grafica_session", { ...cookieOptions(), maxAge: undefined });
  res.json({ message: "Senha alterada. Entre novamente para continuar." });
}
async function registrar(req, res) {
  const login = texto(req.body.login, "Login", 80, true).toLowerCase();
  const senha = texto(req.body.senha, "Senha", 256, true);
  if (!/^[a-z0-9_.-]{3,80}$/.test(login))
    throw new HttpError(
      422,
      "Use de 3 a 80 letras, números, pontos, traços ou sublinhados no login.",
    );
  if (senha.length < 12)
    throw new HttpError(422, "A senha deve ter pelo menos 12 caracteres.");
  const { rows: existing } = await db.query(
    "SELECT id_usuario FROM usuario WHERE login = $1",
    [login],
  );
  if (existing.length)
    throw new HttpError(409, "Esse login já está cadastrado.");
  await db.query(
    "INSERT INTO usuario (nome, login, email, senha_hash, tipo, ativo) VALUES ($1, $2, $2, $3, $4, false)",
    [login, login, await hashPassword(senha), "atendente"],
  );
  res
    .status(201)
    .json({
      message:
        "Conta criada. Aguarde a liberação pelo administrador para entrar.",
    });
}
function logout(req, res) {
  res.clearCookie("grafica_session", { ...cookieOptions(), maxAge: undefined });
  res.json({ message: "Sessão encerrada." });
}
module.exports = { login, registrar, logout, changePassword, hashPassword };
