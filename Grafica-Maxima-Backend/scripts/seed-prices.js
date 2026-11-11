require('dotenv').config();
const { assertSeedAllowed } = require('./guard-seed');
const { Pool } = require('pg');

assertSeedAllowed();
if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL para cadastrar preços.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prices = [['banner', 48], ['adesivo', 36], ['lona', 42], ['papel', 22]];

async function seedPrices() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [tipo, price] of prices) {
      await client.query(
        'INSERT INTO preco_m2 (tipo, preco_base_m2) VALUES ($1, $2) ON CONFLICT (tipo) DO NOTHING',
        [tipo, price],
      );
    }
    await client.query('COMMIT');
    console.log(`Preços por m² verificados: ${prices.length}. Valores existentes preservados.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedPrices().catch((error) => { console.error(error.message); process.exitCode = 1; });
