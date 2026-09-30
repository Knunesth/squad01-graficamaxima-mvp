/**
 * Script de migração de banco de dados.
 * Executa os arquivos .sql da pasta database/migrations em ordem numérica.
 *
 * Uso: npm run migrate
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATION_DIR = path.join(__dirname, 'database', 'migrations');

async function run() {
    const connection = await mysql.createConnection({
        host:     process.env.DB_HOST     || 'localhost',
        user:     process.env.DB_USER     || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME     || 'graficamaxima',
        port:     Number(process.env.DB_PORT) || 3306,
        multipleStatements: true,
    });

    console.log('Conectado ao banco. Aplicando migrações...\n');

    const arquivos = fs.readdirSync(MIGRATION_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();

    for (const arquivo of arquivos) {
        const caminho = path.join(MIGRATION_DIR, arquivo);
        const sql = fs.readFileSync(caminho, 'utf8');
        try {
            await connection.query(sql);
            console.log(`✅ ${arquivo} aplicado.`);
        } catch (err) {
            // Erros como "Duplicate column name" são ignorados (migração já aplicada)
            const IGNORADOS = [1060, 1061, 1062, 1054, 1050];
            if (IGNORADOS.includes(err.errno)) {
                console.log(`⚠️  ${arquivo} — já aplicado anteriormente (${err.message.split('\n')[0]}).`);
            } else {
                console.error(`❌ Erro em ${arquivo}:`, err.message);
                process.exitCode = 1;
            }
        }
    }

    await connection.end();
    console.log('\nMigrações concluídas.');
}

run().catch(err => { console.error('Erro fatal:', err.message); process.exit(1); });
