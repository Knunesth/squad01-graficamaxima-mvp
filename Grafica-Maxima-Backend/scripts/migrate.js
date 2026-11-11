require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL para executar as migrations.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [781513204]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      nome varchar(255) PRIMARY KEY,
      aplicado_em timestamptz NOT NULL DEFAULT now()
    )`);
    const directory = path.join(__dirname, '..', 'database', 'migrations');
    const files = (await fs.readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE nome = $1', [file]);
      if (rows.length) continue;
      const sql = await fs.readFile(path.join(directory, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Migração aplicada: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [781513204]); } finally {
      client.release();
      await pool.end();
    }
  }
}

migrate().catch((error) => { console.error('Migração interrompida:', error.message); process.exitCode = 1; });
