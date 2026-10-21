// Run with both servers running. Creates only TESTE_ records and removes them in finally.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mysql = require('mysql2/promise');
const { hashPassword } = require('../src/services/password');

const apiUrl = `http://localhost:${Number(process.env.PORT) || 3301}`;
const frontUrl = process.env.TEST_FRONT_URL || 'http://localhost:5173';
const tag = `TESTE_${randomBytes(5).toString('hex')}`;
let connection;
let userId;
let clientId;
let quoteId;
let cookie;

function log(label, status, detail = '') {
  console.log(`${label}: ${status}${detail ? ` (${detail})` : ''}`);
}

async function request(path, options = {}, expected) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      Origin: frontUrl,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
  });
  assert.equal(response.status, expected, `${options.method || 'GET'} ${path}: HTTP ${response.status}`);
  assert.equal(response.headers.get('access-control-allow-origin'), frontUrl, `CORS ${path}`);
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true', `Credenciais CORS ${path}`);
  const body = await response.json();
  log(`${options.method || 'GET'} ${path}`, response.status);
  return { response, body };
}

async function counts() {
  const [[row]] = await connection.query(`SELECT
    (SELECT COUNT(*) FROM usuario) AS usuarios,
    (SELECT COUNT(*) FROM cliente) AS clientes,
    (SELECT COUNT(*) FROM orcamento) AS orcamentos,
    (SELECT COUNT(*) FROM item) AS itens,
    (SELECT COUNT(*) FROM historico_log) AS logs`);
  return row;
}

async function cleanup() {
  if (!connection) return;
  if (quoteId) {
    const [items] = await connection.query('SELECT id_item FROM item WHERE id_orcamento = ?', [quoteId]);
    for (const item of items) {
      for (const table of ['acabamento_item', 'item_corte', 'servico_item']) {
        await connection.query(`DELETE FROM ${table} WHERE id_item = ?`, [item.id_item]);
      }
    }
    await connection.query('DELETE FROM item WHERE id_orcamento = ?', [quoteId]);
    await connection.query('DELETE FROM documento WHERE id_orcamento = ?', [quoteId]);
    await connection.query('DELETE FROM orcamento WHERE id_orcamento = ?', [quoteId]);
  }
  if (clientId) await connection.query('DELETE FROM cliente WHERE id_cliente = ?', [clientId]);
  if (userId) {
    await connection.query('DELETE FROM historico_log WHERE id_usuario = ?', [userId]);
    await connection.query('DELETE FROM usuario WHERE id_usuario = ?', [userId]);
  }
  await connection.end();
  log('Limpeza TESTE_', 'OK');
}

async function run() {
  connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'graficamaxima',
    port: Number(process.env.DB_PORT) || 3306,
  });
  const before = await counts();
  const [originalPrices] = await connection.query('SELECT tipo, preco_base_m2 FROM preco_m2 ORDER BY tipo');
  try {
    const front = await fetch(frontUrl);
    assert.equal(front.status, 200);
    assert.match(await front.text(), /<div id="root"><\/div>/);
    log('Frontend dev', front.status);
    await request('/health', {}, 200);
    for (const path of ['/api/clientes', '/api/orcamentos', '/api/dashboard', '/api/materiais', '/api/calculo/tipos']) {
      await request(path, {}, 401);
    }
    const preflight = await fetch(`${apiUrl}/api/clientes`, {
      method: 'OPTIONS',
      headers: { Origin: frontUrl, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), frontUrl);
    log('CORS preflight', preflight.status);

    const password = randomBytes(24).toString('hex');
    const [inserted] = await connection.query(
      'INSERT INTO usuario (nome, login, email, senha_hash, tipo, ativo) VALUES (?, ?, ?, ?, ?, 1)',
      [tag, tag.toLowerCase(), `${tag.toLowerCase()}@example.test`, await hashPassword(password), 'admin']
    );
    userId = inserted.insertId;
    const login = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ login: tag.toLowerCase(), senha: password }) }, 200);
    cookie = login.response.headers.get('set-cookie')?.split(';')[0];
    assert.match(cookie || '', /^grafica_session=/);
    assert.equal(login.body.usuario.id_usuario, userId);
    await request('/api/auth/me', {}, 200);

    const clients = await request('/api/clientes', {}, 200);
    assert.ok(Array.isArray(clients.body));
    const quotes = await request('/api/orcamentos', {}, 200);
    assert.ok(Array.isArray(quotes.body.itens));
    await request('/api/dashboard', {}, 200);
    const materials = await request('/api/materiais', {}, 200);
    assert.ok(materials.body.itens.length > 0);
    const prices = await request('/api/calculo/tipos', {}, 200);
    assert.ok(prices.body.tipos.length > 0);
    await request('/api/auth/usuarios', {}, 200);

    const client = { nome: tag, telefone: '61999999999', email: `${tag.toLowerCase()}@example.test`, cpf_cnpj: `99${randomBytes(6).toString('hex').replace(/[a-f]/g, '1').slice(0, 12)}` };
    const createdClient = await request('/api/clientes', { method: 'POST', body: JSON.stringify(client) }, 201);
    clientId = createdClient.body.id_cliente;
    assert.ok(clientId);
    const listed = await request('/api/clientes', {}, 200);
    assert.ok(listed.body.some((row) => row.id_cliente === clientId));
    const updated = { ...client, nome: `${tag}_EDITADO` };
    await request(`/api/clientes/${clientId}`, { method: 'PUT', body: JSON.stringify(updated) }, 200);
    const fromDb = await connection.query('SELECT nome FROM cliente WHERE id_cliente = ?', [clientId]);
    assert.equal(fromDb[0][0].nome, updated.nome);
    log('Cliente persistido/atualizado no MySQL', 'OK');

    const type = prices.body.tipos[0];
    const calculation = await request('/api/calculo/metro-quadrado/simulacao', {
      method: 'POST', body: JSON.stringify({ tipo_servico: type.tipo, largura: 1, altura: 1, quantidade: 2 }),
    }, 200);
    assert.equal(Number(calculation.body.calculo.preco_por_m2), Number(type.preco_base_m2));
    const material = materials.body.itens[0];
    const payload = {
      id_cliente: clientId, observacoes: tag, data_validade: null, prazo_entrega: null,
      desconto_tipo: 'percentual', desconto_valor: 0,
      itens: [{ id_material: material.id_material, tipo_produto: material.nome, quantidade: 2, valor_unitario: calculation.body.calculo.valor_unitario }],
    };
    const createdQuote = await request('/api/orcamentos', { method: 'POST', body: JSON.stringify(payload) }, 201);
    quoteId = createdQuote.body.id_orcamento;
    assert.ok(quoteId);
    const listedQuotes = await request(`/api/orcamentos?busca=${encodeURIComponent(updated.nome)}`, {}, 200);
    assert.ok(listedQuotes.body.itens.some((row) => row.id_orcamento === quoteId));
    const savedQuote = await request(`/api/orcamentos/${quoteId}`, {}, 200);
    assert.equal(savedQuote.body.observacoes, tag);
    assert.equal(savedQuote.body.itens.length, 1);
    log('Orçamento persistido no MySQL', 'OK');
    payload.observacoes = `${tag}_EDITADO`;
    payload.versao = savedQuote.body.versao;
    payload.itens[0].id_item = savedQuote.body.itens[0].id_item;
    await request(`/api/orcamentos/${quoteId}`, { method: 'PUT', body: JSON.stringify(payload) }, 200);
    const [[editedQuote]] = await connection.query('SELECT observacoes FROM orcamento WHERE id_orcamento = ?', [quoteId]);
    assert.equal(editedQuote.observacoes, `${tag}_EDITADO`);
    log('Orçamento atualizado no MySQL', 'OK');

    await request(`/api/clientes/${clientId}`, { method: 'DELETE' }, 409);
    await request(`/api/orcamentos/${quoteId}`, { method: 'DELETE' }, 200);
    const [deletedQuote] = await connection.query('SELECT id_orcamento FROM orcamento WHERE id_orcamento = ?', [quoteId]);
    assert.equal(deletedQuote.length, 0);
    await request(`/api/clientes/${clientId}`, { method: 'DELETE' }, 200);
    const [deletedClient] = await connection.query('SELECT id_cliente FROM cliente WHERE id_cliente = ?', [clientId]);
    assert.equal(deletedClient.length, 0);
    log('Exclusões confirmadas no MySQL', 'OK');

    await request('/api/auth/logout', { method: 'POST' }, 200);
    cookie = null;
    await request('/api/dashboard', {}, 401);
    log('Fluxo de logout', 'OK');

    const [afterPrices] = await connection.query('SELECT tipo, preco_base_m2 FROM preco_m2 ORDER BY tipo');
    assert.deepEqual(afterPrices, originalPrices);
    log('Preços originais preservados', 'OK');
  } finally {
    await cleanup();
    const verify = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'graficamaxima', port: Number(process.env.DB_PORT) || 3306,
    });
    const [[after]] = await verify.query(`SELECT
      (SELECT COUNT(*) FROM usuario) AS usuarios,
      (SELECT COUNT(*) FROM cliente) AS clientes,
      (SELECT COUNT(*) FROM orcamento) AS orcamentos,
      (SELECT COUNT(*) FROM item) AS itens,
      (SELECT COUNT(*) FROM historico_log) AS logs`);
    await verify.end();
    assert.deepEqual(after, before);
    log('Contagens originais restauradas', 'OK');
  }
}

run().catch((error) => {
  console.error('E2E FALHOU:', error.message);
  process.exitCode = 1;
});
