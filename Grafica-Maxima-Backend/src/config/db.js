const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL precisa estar definida para conectar ao PostgreSQL.');
}

const databaseUrl = new URL(process.env.DATABASE_URL);
const urlSslMode = databaseUrl.searchParams.get('sslmode');
for (const option of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
  databaseUrl.searchParams.delete(option);
}

const configuredSslMode = (process.env.DATABASE_SSL || urlSslMode || 'disable').toLowerCase();
if (!['disable', 'false', '0', 'require', 'verify-ca', 'verify-full', 'true', '1'].includes(configuredSslMode)) {
  throw new Error('DATABASE_SSL deve ser disable, require, verify-ca ou verify-full.');
}
const sslEnabled = !['disable', 'false', '0'].includes(configuredSslMode);
const sslCa = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n');
const pool = new Pool({
  connectionString: databaseUrl.toString(),
  ...(sslEnabled
    ? { ssl: { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) } }
    : {}),
});

async function query(text, values = []) {
  const result = await pool.query(text, values);
  return { rows: result.rows, rowCount: result.rowCount };
}

async function getClient() {
  const client = await pool.connect();
  return {
    query: async (text, values = []) => {
      const result = await client.query(text, values);
      return { rows: result.rows, rowCount: result.rowCount };
    },
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK'),
    release: () => client.release(),
  };
}

module.exports = { query, getClient, end: () => pool.end() };
