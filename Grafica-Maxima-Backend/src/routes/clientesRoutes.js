const router = require("express").Router();
const db = require("../config/db");
const { autenticar } = require("../middlewares/AuthRole");
const { texto, id, HttpError } = require("../utils/validation");

router.use(autenticar);
function validarCliente(body) {
  const nome = texto(body.nome, "Nome", 100, true);
  const telefone = texto(body.telefone, "Telefone", 20, true);
  const email = texto(body.email, "E-mail", 100, true).toLowerCase();
  const cpf_cnpj = texto(body.cpf_cnpj, "CPF ou CNPJ", 20, true).replace(
    /\D/g,
    "",
  );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(422, "E-mail inválido.");
  if (![11, 14].includes(cpf_cnpj.length))
    throw new HttpError(422, "CPF ou CNPJ deve conter 11 ou 14 dígitos.");
  if (telefone.replace(/\D/g, "").length < 10)
    throw new HttpError(422, "Telefone inválido.");
  return { nome, telefone, email, cpf_cnpj };
}
router.get("/", async (req, res) => {
  const { rows } = await db.query(
    "SELECT id_cliente, nome, telefone, email, cpf_cnpj, data_cadastro FROM cliente ORDER BY id_cliente DESC",
  );
  res.json(rows);
});
router.get("/:id", async (req, res) => {
  const { rows } = await db.query(
    "SELECT id_cliente, nome, telefone, email, cpf_cnpj, data_cadastro FROM cliente WHERE id_cliente = $1",
    [id(req.params.id)],
  );
  if (!rows.length) throw new HttpError(404, "Cliente não encontrado.");
  res.json(rows[0]);
});
router.post("/buscar", async (req, res) => {
  const email = texto(req.body.email, "E-mail", 100, true).toLowerCase();
  const doc = texto(req.body.cpf_cnpj, "CPF ou CNPJ", 20, true).replace(
    /\D/g,
    "",
  );
  if (![11, 14].includes(doc.length))
    throw new HttpError(422, "CPF ou CNPJ inválido.");
  const { rows } = await db.query(
    "SELECT * FROM cliente WHERE LOWER(email) = $1 AND regexp_replace(coalesce(cpf_cnpj,''), '[^0-9]', '', 'g') = $2 ORDER BY id_cliente DESC LIMIT 1",
    [email, doc],
  );
  if (!rows.length)
    throw new HttpError(
      404,
      "Cliente não encontrado. Confira os dados ou cadastre um novo cliente.",
    );
  res.json(rows[0]);
});
router.post("/", async (req, res) => {
  const c = validarCliente(req.body);
  const connection = await db.getClient();
  const lockKey = `cliente:${c.cpf_cnpj}`;
  let locked = false;
  try {
    await connection.query(
      "SELECT pg_advisory_lock(hashtext($1))",
      [lockKey],
    );
    locked = true;
    const { rows: existing } = await connection.query(
      "SELECT id_cliente FROM cliente WHERE regexp_replace(coalesce(cpf_cnpj,''), '[^0-9]', '', 'g') = $1 LIMIT 1",
      [c.cpf_cnpj],
    );
    if (existing.length)
      throw new HttpError(
        409,
        "CPF ou CNPJ já cadastrado. Use a opção Cliente cadastrado.",
      );
    const { rows: created } = await connection.query(
      "INSERT INTO cliente (nome, telefone, email, cpf_cnpj) VALUES ($1, $2, $3, $4) RETURNING id_cliente",
      [c.nome, c.telefone, c.email, c.cpf_cnpj],
    );
    res.status(201).json({ id_cliente: created[0].id_cliente, ...c });
  } finally {
    if (locked) await connection.query("SELECT pg_advisory_unlock(hashtext($1))", [lockKey]);
    connection.release();
  }
});
router.put("/:id", async (req, res) => {
  const clienteId = id(req.params.id);
  const c = validarCliente(req.body);
  const { rows: duplicate } = await db.query(
    "SELECT id_cliente FROM cliente WHERE regexp_replace(coalesce(cpf_cnpj,''), '[^0-9]', '', 'g') = $1 AND id_cliente <> $2 LIMIT 1",
    [c.cpf_cnpj, clienteId],
  );
  if (duplicate.length) throw new HttpError(409, "CPF ou CNPJ já cadastrado.");
  const { rowCount } = await db.query(
    "UPDATE cliente SET nome = $1, telefone = $2, email = $3, cpf_cnpj = $4 WHERE id_cliente = $5",
    [c.nome, c.telefone, c.email, c.cpf_cnpj, clienteId],
  );
  if (!rowCount) throw new HttpError(404, "Cliente não encontrado.");
  res.json({ id_cliente: clienteId, ...c });
});
router.delete("/:id", async (req, res) => {
  const clienteId = id(req.params.id);
  const connection = await db.getClient();
  try {
    await connection.beginTransaction();
    const { rows } = await connection.query(
      "SELECT id_cliente FROM cliente WHERE id_cliente = $1 FOR UPDATE",
      [clienteId],
    );
    if (!rows.length) throw new HttpError(404, "Cliente não encontrado.");
    const { rows: linked } = await connection.query(
      "SELECT COUNT(*)::int AS total FROM orcamento WHERE id_cliente = $1",
      [clienteId],
    );
    if (linked[0].total)
      throw new HttpError(
        409,
        "Cliente possui orçamentos. Exclua-os antes de remover o cadastro.",
      );
    await connection.query("DELETE FROM cliente WHERE id_cliente = $1", [
      clienteId,
    ]);
    await connection.commit();
    res.json({ message: "Cliente excluído." });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
module.exports = router;
