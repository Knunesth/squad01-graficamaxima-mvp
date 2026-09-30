const fs = require('node:fs');
const path = require('node:path');
const db = require('../src/config/db');
async function init() {
  const connection = await db.getConnection();
  try {
    const [tables] = await connection.query('SHOW TABLES');
    if (tables.length) throw new Error('Inicialização permitida apenas em banco vazio. Nenhum dado foi alterado.');
    const source = fs.readFileSync(path.join(__dirname, '../database/graficamaxima.sql'), 'utf8');
    const statements = source.match(/(?:CREATE TABLE|ALTER TABLE)[\s\S]*?;/g);
    await connection.query('SET NAMES utf8mb4');
    for (const sql of statements) await connection.query(sql);
    console.log('Estrutura original criada, sem importar clientes e orçamentos de exemplo. Execute npm run migrate.');
  } finally { connection.release(); await db.end(); }
}
init().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
