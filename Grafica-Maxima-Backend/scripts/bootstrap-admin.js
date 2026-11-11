require('dotenv').config();

const db = require('../src/config/db');
const { hashPassword } = require('../src/services/password');

const login = process.env.BOOTSTRAP_ADMIN_LOGIN?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const email = login?.includes('@') ? login : null;
const loginPattern = /^[a-z0-9_.-]{3,80}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!process.env.DATABASE_URL) {
  throw new Error('Defina DATABASE_URL no ambiente antes do bootstrap.');
}
if (!login || !(loginPattern.test(login) || (login.length <= 80 && emailPattern.test(login)))) {
  throw new Error('Defina BOOTSTRAP_ADMIN_LOGIN com um login válido ou e-mail de até 80 caracteres.');
}
if (!password || password.length < 16) {
  throw new Error('Defina BOOTSTRAP_ADMIN_PASSWORD com pelo menos 16 caracteres.');
}

async function bootstrapAdmin() {
  const client = await db.getClient();
  try {
    await client.beginTransaction();
    await client.query('SELECT pg_advisory_xact_lock($1)', [781513206]);

    const { rows } = await client.query(
      `SELECT id_usuario, tipo, lower(login) AS login, lower(coalesce(email, '')) AS email
       FROM usuario
       WHERE tipo = 'admin' OR lower(login) = $1 OR lower(coalesce(email, '')) = $1
       ORDER BY (tipo = 'admin') DESC
       FOR UPDATE`,
      [login],
    );
    const existingAdmin = rows.find((user) => user.tipo === 'admin');
    if (existingAdmin) {
      if (existingAdmin.login !== login && existingAdmin.email !== login) {
        throw new Error('Já existe um admin; o bootstrap não cria um segundo administrador.');
      }
      await client.commit();
      console.log('Admin já existe; nenhuma alteração aplicada.');
      return;
    }
    if (rows.length) {
      throw new Error('O login informado já pertence a outra conta.');
    }

    const passwordHash = await hashPassword(password);
    await client.query(
      `INSERT INTO usuario (nome, email, login, senha_hash, tipo, ativo)
       VALUES ($1, $2, $3, $4, 'admin', true)`,
      [process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Administradora', email, login, passwordHash],
    );
    await client.commit();
    console.log('Admin inicial criado com senha armazenada em hash.');
  } catch (error) {
    await client.rollback().catch(() => {});
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}

bootstrapAdmin().catch((error) => {
  console.error(`Falha no bootstrap do admin: ${error.message}`);
  process.exitCode = 1;
});
