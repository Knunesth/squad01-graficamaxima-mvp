// Testes HTTP que NÃO dependem de banco: o DATABASE_URL de teste aponta para
// uma porta fechada, então aqui só entram comportamentos decididos antes de
// qualquer consulta (cabeçalhos, CORS, autenticação, validação de entrada) e
// o comportamento do sistema quando o banco está fora do ar.
require('../helpers/env');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');
const db = require('../../src/config/db');

let server;
let base;
const originalStdout = process.stdout.write.bind(process.stdout);
const originalStderr = process.stderr.write.bind(process.stderr);

function requisicao(rota, { method = 'GET', body, headers = {} } = {}) {
  return fetch(base + rota, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

before(async () => {
  // Silencia o log estruturado de requisições para não poluir o relatório.
  process.stdout.write = (chunk, ...args) => (String(chunk).startsWith('{"timestamp"') ? true : originalStdout(chunk, ...args));
  process.stderr.write = (chunk, ...args) => (String(chunk).startsWith('{"timestamp"') ? true : originalStderr(chunk, ...args));
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await db.end();
  process.stdout.write = originalStdout;
  process.stderr.write = originalStderr;
});

describe('app — rotas públicas e cabeçalhos', () => {
  it('GET / responde ok com cabeçalhos de segurança', async () => {
    const res = await requisicao('/');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.match(res.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
  });

  it('gera um X-Request-Id diferente por requisição', async () => {
    const [a, b] = await Promise.all([requisicao('/'), requisicao('/')]);
    assert.notEqual(a.headers.get('x-request-id'), b.headers.get('x-request-id'));
  });

  it('rota desconhecida fora de /api responde 404 em JSON', async () => {
    const res = await requisicao('/nao-existe');
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Rota não encontrada.' });
  });

  it('/health responde 503 quando banco e scheduler estão indisponíveis', async () => {
    const res = await requisicao('/health');
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { status: 'unhealthy', checks: { database: 'unavailable', scheduler: 'inactive' } });
  });
});

describe('app — CORS e origem', () => {
  it('libera a origem configurada com credenciais', async () => {
    const res = await requisicao('/', { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  });

  it('não devolve cabeçalho CORS para origem desconhecida', async () => {
    const res = await requisicao('/', { headers: { Origin: 'https://malicioso.example' } });
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });

  it('bloqueia escrita vinda de origem não permitida (proteção CSRF)', async () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const res = await requisicao('/api/auth/logout', { method, headers: { Origin: 'https://malicioso.example' } });
      assert.equal(res.status, 403, method);
      assert.deepEqual(await res.json(), { error: 'Origem não permitida.' });
    }
  });

  it('aceita escrita sem cabeçalho Origin (clientes não navegador)', async () => {
    const res = await requisicao('/api/auth/logout', { method: 'POST' });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('set-cookie'), /^grafica_session=;/);
  });
});

describe('app — autenticação', () => {
  const rotasProtegidas = [
    '/api/orcamentos', '/api/orcamentos/1', '/api/orcamentos/1/pdf', '/api/clientes', '/api/materiais',
    '/api/calculo/tipos', '/api/reports/history', '/api/dashboard', '/api/auth/me', '/api/auth/usuarios', '/api/qualquer-coisa',
  ];

  it('toda rota de /api exige sessão', async () => {
    for (const rota of rotasProtegidas) {
      const res = await requisicao(rota);
      assert.equal(res.status, 401, rota);
      assert.deepEqual(await res.json(), { error: 'Entre na sua conta para continuar.' }, rota);
    }
  });

  it('rejeita tokens inválidos, de outro segredo, expirados ou sem assinatura', async () => {
    const semAssinatura = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"1"}').toString('base64url')}.`;
    const tokens = [
      'lixo',
      jwt.sign({ sub: '1' }, 'outro-segredo-qualquer-com-32-caracteres'),
      jwt.sign({ sub: '1' }, process.env.JWT_SECRET, { expiresIn: -10 }),
      jwt.sign({ sub: '1' }, process.env.JWT_SECRET, { algorithm: 'HS512' }),
      semAssinatura,
    ];
    for (const token of tokens) {
      const viaBearer = await requisicao('/api/clientes', { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(viaBearer.status, 401);
      const viaCookie = await requisicao('/api/clientes', { headers: { Cookie: `grafica_session=${token}` } });
      assert.equal(viaCookie.status, 401);
    }
  });

  it('com token válido e banco fora do ar responde 500 genérico, sem vazar detalhes', async () => {
    const token = jwt.sign({ sub: '1', ver: 0 }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    const res = await requisicao('/api/clientes', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(res.status, 500);
    const corpo = await res.text();
    assert.deepEqual(JSON.parse(corpo), { error: 'Não foi possível concluir a operação. Tente novamente.' });
    assert.ok(!/ECONNREFUSED|127\.0\.0\.1|postgres/i.test(corpo));
  });
});

describe('app — validação de entrada antes do banco', () => {
  it('login sem credenciais responde 422', async () => {
    for (const body of [{}, { login: 'admin' }, { senha: 'x' }, { login: '   ', senha: 'x' }, { login: { $ne: null }, senha: 'x' }]) {
      const res = await requisicao('/api/auth/login', { method: 'POST', body });
      assert.equal(res.status, 422, JSON.stringify(body));
    }
  });

  it('cadastro valida formato do login e tamanho da senha', async () => {
    const casos = [
      [{ login: 'ab', senha: 'senha-bem-longa-123' }, /3 a 80/],
      [{ login: 'nome com espaço', senha: 'senha-bem-longa-123' }, /3 a 80/],
      [{ login: 'usuario@dominio', senha: 'senha-bem-longa-123' }, /3 a 80/],
      [{ login: 'usuario.ok', senha: 'curta' }, /12 caracteres/],
    ];
    for (const [body, mensagem] of casos) {
      const res = await requisicao('/api/auth/register', { method: 'POST', body });
      assert.equal(res.status, 422, JSON.stringify(body));
      assert.match((await res.json()).error, mensagem);
    }
  });

  it('JSON malformado responde 400 e corpo acima de 100 kB responde 413', async () => {
    const malformado = await requisicao('/api/auth/login', { method: 'POST', body: '{"login": ' });
    assert.equal(malformado.status, 400);
    const grande = await requisicao('/api/auth/login', { method: 'POST', body: { login: 'a'.repeat(120 * 1024), senha: 'x' } });
    assert.equal(grande.status, 413);
  });

  // No Express 5 `req.body` fica undefined quando a requisição não traz
  // corpo JSON; o app garante um objeto vazio para a validação responder 422.
  it('escrita sem corpo JSON responde 422, não 500', async () => {
    for (const rota of ['/api/auth/login', '/api/auth/register']) {
      const semCorpo = await requisicao(rota, { method: 'POST' });
      assert.equal(semCorpo.status, 422, rota);
      const textoPuro = await requisicao(rota, { method: 'POST', body: 'login=admin', headers: { 'Content-Type': 'text/plain' } });
      assert.equal(textoPuro.status, 422, rota);
    }
  });
});
