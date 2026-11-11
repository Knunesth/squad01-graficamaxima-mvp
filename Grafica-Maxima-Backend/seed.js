require('dotenv').config();
const { Pool } = require('pg');
const { hashPassword } = require('./src/services/password');

if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL para executar o seed.');
if (!process.env.ADMIN_PASSWORD || !process.env.ATTENDANT_PASSWORD) {
  throw new Error('Defina ADMIN_PASSWORD e ATTENDANT_PASSWORD no ambiente antes do seed.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const clientes = [
  ['Studio Ipê', '61 99911-1001', 'contato@studioipe.example', '11111111111'],
  ['Café Central', '61 99911-1002', 'compras@cafecentral.example', '22222222222'],
  ['Clínica Horizonte', '61 99911-1003', 'marketing@horizonte.example', '33333333333'],
  ['Escola Girassol', '61 99911-1004', 'secretaria@girassol.example', '44444444444'],
  ['Mercado do Bairro', '61 99911-1005', 'loja@mercadobairro.example', '55555555555'],
  ['Ateliê Raiz', '61 99911-1006', 'oi@atelieraiz.example', '66666666666'],
];
const materiais = [
  ['Offset', 'Offset 90g A4', 0.18, 0, 0.12, 0],
  ['Couchê 64', 'Couchê brilho 250g', 0.48, 0, 0.22, 0],
  ['Supremo', 'Cartão Supremo 300g', 0.72, 0, 0.28, 0],
  ['Laminação', 'Laminação fosca', 0, 0.45, 0, 0.2],
  ['Corte. Esp', 'Corte especial', 8, 0.03, 5, 0.02],
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT count(*)::int AS total FROM usuario');
    if (existing.rows[0].total > 0) throw new Error('O banco já contém usuários; use uma base limpa para aplicar o seed de demonstração.');

    const [adminHash, attendantHash] = await Promise.all([
      hashPassword(process.env.ADMIN_PASSWORD),
      hashPassword(process.env.ATTENDANT_PASSWORD),
    ]);
    const admin = await client.query(
      "INSERT INTO usuario (nome, email, login, senha_hash, tipo, ativo) VALUES ($1,$2,$3,$4,'admin',true) RETURNING id_usuario",
      ['Administradora da Gráfica', process.env.ADMIN_EMAIL || 'admin@graficamaxima.example', process.env.ADMIN_LOGIN || 'admin', adminHash],
    );
    const attendant = await client.query(
      "INSERT INTO usuario (nome, email, login, senha_hash, tipo, ativo) VALUES ($1,$2,$3,$4,'atendente',true) RETURNING id_usuario",
      ['Atendente de Demonstração', process.env.ATTENDANT_EMAIL || 'atendente@graficamaxima.example', process.env.ATTENDANT_LOGIN || 'atendente', attendantHash],
    );

    const clientIds = [];
    for (const row of clientes) {
      const result = await client.query(
        'INSERT INTO cliente (nome, telefone, email, cpf_cnpj) VALUES ($1,$2,$3,$4) RETURNING id_cliente', row,
      );
      clientIds.push(result.rows[0].id_cliente);
    }
    const materialIds = [];
    for (const row of materiais) {
      const result = await client.query(
        'INSERT INTO material (categoria,nome,custo_fixo,custo_unitario,lucro_fixo,lucro_unitario) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_material', row,
      );
      materialIds.push(result.rows[0].id_material);
    }
    for (const [tipo, preco] of [['banner', 48], ['adesivo', 36], ['lona', 42], ['papel', 22]]) {
      await client.query('INSERT INTO preco_m2 (tipo,preco_base_m2) VALUES ($1,$2) ON CONFLICT (tipo) DO NOTHING', [tipo, preco]);
    }

    const now = new Date();
    const statuses = ['Finalizado', 'Aprovado', 'Em negociação', 'Inativo'];
    const products = ['Cartões de visita', 'Panfletos A5', 'Banner promocional', 'Etiquetas adesivas', 'Folders institucionais', 'Cardápio laminado'];
    for (let i = 0; i < 36; i++) {
      const monthsAgo = Math.floor(i / 12);
      const created = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 2 + ((i * 3) % 25), 10 + (i % 8), 30);
      const status = statuses[i % statuses.length];
      const total = Number((85 + ((i * 73) % 940) + (i % 5) * 0.5).toFixed(2));
      const customerId = clientIds[i % clientIds.length];
      const userId = i % 3 === 0 ? admin.rows[0].id_usuario : attendant.rows[0].id_usuario;
      const finalized = status === 'Finalizado' ? new Date(created.getTime() + (2 + (i % 6)) * 86400000) : null;
      const quote = await client.query(
        'INSERT INTO orcamento (id_usuario,id_cliente,data_criacao,data_finalizacao,valor_total,valor_unitario,subtotal,status,prazo_entrega,observacoes,quantidade) VALUES ($1,$2,$3,$4,$5,$6,$5,$7,$8,$9,$10) RETURNING id_orcamento',
        [userId, customerId, created, finalized, total, Number((total / (50 + i * 10)).toFixed(4)), status, new Date(created.getTime() + 7 * 86400000), `Seed demonstração: ${products[i % products.length]}`, 50 + i * 10],
      );
      const materialId = materialIds[i % materialIds.length];
      const qty = 50 + i * 10;
      await client.query(
        'INSERT INTO item (id_orcamento,id_material,tipo_produto,quantidade,valor_unitario,valor_total,precificacao_snapshot) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [quote.rows[0].id_orcamento, materialId, products[i % products.length], qty, Number((total / qty).toFixed(4)), total, JSON.stringify({ seed: true })],
      );
    }
    await client.query('COMMIT');
    console.log('Seed concluído: usuários de exemplo, clientes, materiais, preços e 36 orçamentos históricos.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => { console.error('Seed interrompido:', error.message); process.exitCode = 1; });
