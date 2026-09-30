const fs = require('node:fs');
const path = require('node:path');
const db = require('../src/config/db');

async function migrate() {
  const conn = await db.getConnection();
  try {
    const [[lock]] = await conn.query("SELECT GET_LOCK('grafica_maxima_migrations', 10) AS acquired");
    if (lock.acquired !== 1) throw new Error('Outra migração está em andamento.');
    await conn.query('CREATE TABLE IF NOT EXISTS schema_migrations (nome VARCHAR(200) PRIMARY KEY, aplicado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    const directory = path.join(__dirname, '../database/migrations');
    for (const file of fs.readdirSync(directory).filter(f => f.endsWith('.sql')).sort()) {
      const [done] = await conn.query('SELECT nome FROM schema_migrations WHERE nome = ?', [file]);
      if (done.length) continue;
      // DDL em MySQL faz commit implícito. Registrar cada passo permite retomar após falha.
      const statements = fs.readFileSync(path.join(directory, file), 'utf8').replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean);
      for (let i = 0; i < statements.length; i++) {
        const key = `${file}:${i}`;
        const [step] = await conn.query('SELECT nome FROM schema_migrations WHERE nome = ?', [key]);
        if (step.length) continue;
        await conn.query(statements[i]);
        await conn.query('INSERT INTO schema_migrations (nome) VALUES (?)', [key]);
      }
      await conn.query('INSERT INTO schema_migrations (nome) VALUES (?)', [file]);
      console.log(`Migração aplicada: ${file}`);
    }
    const precos = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/services/precos.json'), 'utf8'));
    for (const [tipo, preco] of Object.entries(precos)) {
      if (!Number.isFinite(Number(preco)) || Number(preco) <= 0) throw new Error('Preço de m² inválido no arquivo legado.');
      await conn.query('INSERT IGNORE INTO preco_m2 (tipo, preco_base_m2) VALUES (?, ?)', [tipo, preco]);
    }
  } finally {
    await conn.query("SELECT RELEASE_LOCK('grafica_maxima_migrations')");
    conn.release();
    await db.end();
  }
}
migrate().catch(e => { console.error('Migração interrompida:', e.code || e.message); process.exitCode = 1; });
