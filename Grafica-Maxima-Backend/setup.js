/**
 * Script de setup completo do banco de dados da Gráfica Máxima.
 * 
 * Executa na ordem:
 * 1. Cria o banco se não existir
 * 2. Aplica o schema base (graficamaxima.sql)
 * 3. Aplica migrações da pasta database/migrations/
 * 4. Cria/atualiza o usuário admin
 *
 * Uso: npm run setup
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { hashPassword } = require('./src/services/password');

const DB_NAME       = process.env.DB_NAME     || 'graficamaxima';
const SCHEMA_FILE   = path.join(__dirname, 'database', 'graficamaxima.sql');
const MIGRATION_DIR = path.join(__dirname, 'database', 'migrations');
const ADMIN_LOGIN   = 'admin';
const ADMIN_NOME    = 'Admin Principal';
const ADMIN_SENHA   = 'Maxima2026!';

async function conectar(database = null) {
    return mysql.createConnection({
        host:               process.env.DB_HOST     || 'localhost',
        user:               process.env.DB_USER     || 'root',
        password:           process.env.DB_PASSWORD || '',
        database,
        port:               Number(process.env.DB_PORT) || 3306,
        multipleStatements: true,
    });
}

async function run() {
    // 1. Criar banco se não existir
    console.log(`\n📦 Verificando banco de dados '${DB_NAME}'...`);
    const connRoot = await conectar();
    await connRoot.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    console.log(`✅ Banco '${DB_NAME}' pronto.`);
    await connRoot.end();

    // 2. Aplicar schema base
    const conn = await conectar(DB_NAME);

    if (fs.existsSync(SCHEMA_FILE)) {
        console.log(`\n🗄️  Aplicando schema base (graficamaxima.sql)...`);
        const schemaSQL = fs.readFileSync(SCHEMA_FILE, 'utf8');
        try {
            await conn.query(schemaSQL);
            console.log('✅ Schema base aplicado.');
        } catch (err) {
            const IGNORADOS = [1050, 1060, 1061, 1062];
            if (IGNORADOS.includes(err.errno)) {
                console.log('⚠️  Schema já existia (ignorando conflitos de CREATE TABLE).');
            } else {
                console.warn(`⚠️  Aviso no schema: ${err.message.split('\n')[0]}`);
            }
        }
    }

    // 3. Aplicar migrações em ordem
    if (fs.existsSync(MIGRATION_DIR)) {
        const arquivos = fs.readdirSync(MIGRATION_DIR).filter(f => f.endsWith('.sql')).sort();
        if (arquivos.length > 0) {
            console.log('\n🔄 Aplicando migrações...');
            for (const arquivo of arquivos) {
                const sql = fs.readFileSync(path.join(MIGRATION_DIR, arquivo), 'utf8');
                try {
                    await conn.query(sql);
                    console.log(`✅ ${arquivo} aplicado.`);
                } catch (err) {
                    const IGNORADOS = [1060, 1061, 1062, 1054, 1050];
                    if (IGNORADOS.includes(err.errno)) {
                        console.log(`⚠️  ${arquivo} — já aplicado (${err.message.split('\n')[0]}).`);
                    } else {
                        console.error(`❌ Erro em ${arquivo}:`, err.message);
                        process.exitCode = 1;
                    }
                }
            }
        }
    }

    // 4. Criar/atualizar admin
    console.log('\n👤 Criando usuário admin...');
    const hash = await hashPassword(ADMIN_SENHA);
    const [update] = await conn.query(
        `UPDATE usuario SET nome = ?, login = ?, senha_hash = ?, tipo = 'admin', ativo = 1 WHERE id_usuario = 1 OR login = ?`,
        [ADMIN_NOME, ADMIN_LOGIN, hash, ADMIN_LOGIN]
    );

    if (update.affectedRows === 0) {
        await conn.query(
            `INSERT INTO usuario (nome, login, email, senha_hash, tipo, ativo) VALUES (?, ?, ?, ?, 'admin', 1)`,
            [ADMIN_NOME, ADMIN_LOGIN, 'admin@grafica.com', hash]
        );
        console.log('✅ Admin criado!');
    } else {
        console.log('✅ Admin atualizado!');
    }

    await conn.end();

    console.log(`
╔══════════════════════════════════════════╗
║       SETUP CONCLUÍDO COM SUCESSO!       ║
╠══════════════════════════════════════════╣
║  Login:  admin                           ║
║  Senha:  Maxima2026!                     ║
╠══════════════════════════════════════════╣
║  ⚠️  Altere a senha após o 1° login!    ║
╚══════════════════════════════════════════╝

  Agora rode: npm run dev
`);
}

run().catch(err => { console.error('\n❌ Erro fatal:', err.message); process.exit(1); });
