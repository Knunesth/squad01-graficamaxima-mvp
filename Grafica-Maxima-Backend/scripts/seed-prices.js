require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const db = require('../src/config/db');

async function loadPrices(connection) {
  const file = path.join(__dirname, '../src/services/precos.json');
  const prices = JSON.parse(fs.readFileSync(file, 'utf8'));
  const entries = Object.entries(prices);
  if (!entries.length || entries.some(([type, price]) => !type || !Number.isFinite(Number(price)) || Number(price) <= 0)) {
    throw new Error('Catálogo de preços de m² inválido.');
  }

  for (const [type, price] of entries) {
    await connection.query(
      'INSERT IGNORE INTO preco_m2 (tipo, preco_base_m2) VALUES (?, ?)',
      [type, Number(price)]
    );
  }
  return entries.length;
}

async function seedPrices() {
  const connection = await db.getConnection();
  try {
    const count = await loadPrices(connection);
    console.log(`Preços de m² verificados: ${count}. Valores existentes preservados.`);
  } finally {
    connection.release();
    await db.end();
  }
}

if (require.main === module) {
  seedPrices().catch(error => {
    console.error('Falha ao carregar preços de m²:', error.code || error.message);
    process.exitCode = 1;
  });
}

module.exports = { loadPrices };
