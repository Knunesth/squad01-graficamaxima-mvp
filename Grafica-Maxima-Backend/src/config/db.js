const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL precisa estar definida para conectar ao PostgreSQL.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
