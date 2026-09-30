/**
 * Script de seed: cria/atualiza o usuário admin padrão.
 * Uso: npm run seed
 * 
 * As credenciais padrão são:
 *   Login: admin
 *   Senha: Maxima2026!
 * (altere aqui antes de rodar em produção)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { hashPassword } = require('./src/services/password');

const ADMIN_LOGIN = 'admin';
const ADMIN_NOME  = 'Admin Principal';
const ADMIN_SENHA = 'Maxima2026!';

async function run() {
    const connection = await mysql.createConnection({
        host:     process.env.DB_HOST     || 'localhost',
        user:     process.env.DB_USER     || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME     || 'graficamaxima',
        port:     Number(process.env.DB_PORT) || 3306,
    });

    const hash = await hashPassword(ADMIN_SENHA);

    // Tenta atualizar o admin existente; se não existir, insere
    const [update] = await connection.query(
        `UPDATE usuario SET nome = ?, login = ?, senha_hash = ?, tipo = 'admin', ativo = 1 WHERE id_usuario = 1 OR login = ?`,
        [ADMIN_NOME, ADMIN_LOGIN, hash, ADMIN_LOGIN]
    );

    if (update.affectedRows === 0) {
        await connection.query(
            `INSERT INTO usuario (nome, login, email, senha_hash, tipo, ativo) VALUES (?, ?, ?, ?, 'admin', 1)`,
            [ADMIN_NOME, ADMIN_LOGIN, 'admin@grafica.com', hash]
        );
        console.log('✅ Usuário admin criado com sucesso!');
    } else {
        console.log('✅ Senha do admin atualizada com sucesso!');
    }

    console.log(`\nCredenciais de acesso:`);
    console.log(`  Login: ${ADMIN_LOGIN}`);
    console.log(`  Senha: ${ADMIN_SENHA}`);
    console.log(`\n⚠️  Altere a senha após o primeiro login.`);

    await connection.end();
}

run().catch(err => { console.error('Erro fatal:', err.message); process.exit(1); });
