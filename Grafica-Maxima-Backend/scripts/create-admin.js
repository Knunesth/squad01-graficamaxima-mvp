const db = require('../src/config/db');
const { hashPassword } = require('../src/services/password');
async function run() {
  const login = process.env.ADMIN_LOGIN;
  const senha = process.env.ADMIN_PASSWORD;
  if (!login || !/^[a-zA-Z0-9_.-]{3,80}$/.test(login) || !senha || senha.length < 12) throw new Error('Defina ADMIN_LOGIN e ADMIN_PASSWORD (mínimo 12 caracteres) no ambiente.');
  await db.query('INSERT INTO usuario (nome, login, senha_hash, tipo, ativo) VALUES (?, ?, ?, ?, 1)', [login, login.toLowerCase(), await hashPassword(senha), 'admin']);
  console.log('Administrador criado. Remova ADMIN_PASSWORD do ambiente após o uso.');
}
run().catch(e => { console.error(e.code || e.message); process.exitCode = 1; }).finally(() => db.end());
