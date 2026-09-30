const router = require('express').Router();
const db = require('../config/db');
const { texto, HttpError } = require('../utils/validation');
function validarCliente(body) {
  const nome = texto(body.nome, 'Nome', 100, true);
  const telefone = texto(body.telefone, 'Telefone', 20, true);
  const email = texto(body.email, 'E-mail', 100, true).toLowerCase();
  const cpf_cnpj = texto(body.cpf_cnpj, 'CPF ou CNPJ', 20, true).replace(/\D/g, '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(422, 'E-mail inválido.');
  if (![11, 14].includes(cpf_cnpj.length)) throw new HttpError(422, 'CPF ou CNPJ deve conter 11 ou 14 dígitos.');
  if (telefone.replace(/\D/g, '').length < 10) throw new HttpError(422, 'Telefone inválido.');
  return { nome, telefone, email, cpf_cnpj };
}
router.post('/buscar', async (req, res) => {
  const email = texto(req.body.email, 'E-mail', 100, true).toLowerCase();
  const doc = texto(req.body.cpf_cnpj, 'CPF ou CNPJ', 20, true).replace(/\D/g, '');
  if (![11, 14].includes(doc.length)) throw new HttpError(422, 'CPF ou CNPJ inválido.');
  const [rows] = await db.query("SELECT * FROM cliente WHERE LOWER(email) = ? AND REPLACE(REPLACE(REPLACE(cpf_cnpj,'.',''),'-',''),'/','') = ? ORDER BY id_cliente DESC LIMIT 1", [email, doc]);
  if (!rows.length) throw new HttpError(404, 'Cliente não encontrado. Confira os dados ou cadastre um novo cliente.');
  res.json(rows[0]);
});
router.post('/', async (req, res) => {
  const c = validarCliente(req.body);
  const connection = await db.getConnection();
  const lockKey = `cliente:${c.cpf_cnpj}`;
  let locked = false;
  try {
    const [[lock]] = await connection.query('SELECT GET_LOCK(?, 5) AS acquired', [lockKey]);
    locked = lock.acquired === 1;
    if (!locked) throw new HttpError(409, 'Cadastro em andamento. Tente novamente.');
    const [existing] = await connection.query("SELECT id_cliente FROM cliente WHERE REPLACE(REPLACE(REPLACE(cpf_cnpj,'.',''),'-',''),'/','') = ? LIMIT 1", [c.cpf_cnpj]);
    if (existing.length) throw new HttpError(409, 'CPF ou CNPJ já cadastrado. Use a opção Cliente cadastrado.');
    const [result] = await connection.query('INSERT INTO cliente (nome, telefone, email, cpf_cnpj) VALUES (?, ?, ?, ?)', [c.nome, c.telefone, c.email, c.cpf_cnpj]);
    res.status(201).json({ id_cliente: result.insertId, ...c });
  } finally {
    if (locked) await connection.query('SELECT RELEASE_LOCK(?)', [lockKey]);
    connection.release();
  }
});
module.exports = router;
