const jwt = require("jsonwebtoken");
const db = require("../config/db");
async function autenticar(req, res, next) {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("grafica_session="))
    ?.slice("grafica_session=".length);
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  let payload;
  try {
    payload = jwt.verify(bearer || cookie || "", process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch {
    return res
      .status(401)
      .json({ error: "Entre na sua conta para continuar." });
  }
  try {
    const { rows: users } = await db.query(
      "SELECT id_usuario, nome, login, tipo, token_version FROM usuario WHERE id_usuario = $1 AND ativo = true",
      [payload.sub],
    );
    if (!users.length)
      return res.status(401).json({ error: "Sessão inválida." });
    if ((payload.ver ?? 0) !== users[0].token_version)
      return res.status(401).json({ error: "Sessão expirada. Entre novamente." });
    delete users[0].token_version;
    req.usuario = users[0];
    next();
  } catch (error) {
    next(error);
  }
}
function apenasAdmin(req, res, next) {
  if (req.usuario?.tipo !== "admin")
    return res
      .status(403)
      .json({ error: "Apenas administradores podem realizar esta ação." });
  next();
}
module.exports = { autenticar, apenasAdmin };
