const { capturarErro, capturarSaida } = require('../helpers/env');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { hashPassword, verifyPassword } = require('../../src/services/password');
const { getAllowedOrigins } = require('../../src/config/cors');
const { parseTrustProxy } = require('../../src/config/trustProxy');
const { assertSeedAllowed } = require('../../scripts/guard-seed');
const { createLoginRateLimiter } = require('../../src/middlewares/loginRateLimiter');
const errorHandler = require('../../src/middlewares/errorHandler');
const logger = require('../../src/utils/logger');

describe('password (scrypt)', () => {
  it('gera hash no formato scrypt$salt$hash e nunca guarda a senha', async () => {
    const hash = await hashPassword('senha-de-teste-123');
    assert.match(hash, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    assert.ok(!hash.includes('senha-de-teste-123'));
  });

  it('usa salt aleatório: a mesma senha gera hashes diferentes', async () => {
    const [a, b] = await Promise.all([hashPassword('mesma-senha-123'), hashPassword('mesma-senha-123')]);
    assert.notEqual(a, b);
  });

  it('confere a senha correta e rejeita a errada', async () => {
    const hash = await hashPassword('senha-de-teste-123');
    assert.equal(await verifyPassword('senha-de-teste-123', hash), true);
    assert.equal(await verifyPassword('senha-de-teste-124', hash), false);
    assert.equal(await verifyPassword('', hash), false);
  });

  it('rejeita hashes ausentes, legados ou malformados sem lançar', async () => {
    for (const armazenado of [undefined, null, '', 'hash_seguro_123', 'scrypt$abc$def', 'bcrypt$' + 'a'.repeat(32) + '$' + 'b'.repeat(128)]) {
      assert.equal(await verifyPassword('qualquer-senha', armazenado), false);
    }
  });
});

describe('config/cors', () => {
  it('em produção libera somente as origens configuradas', () => {
    assert.deepEqual(
      getAllowedOrigins({ NODE_ENV: 'production', CORS_ORIGINS: 'https://a.example, https://b.example ,' }),
      ['https://a.example', 'https://b.example'],
    );
    assert.deepEqual(getAllowedOrigins({ NODE_ENV: 'production' }), []);
  });

  it('usa FRONTEND_URL quando CORS_ORIGINS não está definida', () => {
    assert.deepEqual(getAllowedOrigins({ NODE_ENV: 'production', FRONTEND_URL: 'https://app.example' }), ['https://app.example']);
  });

  it('fora de produção acrescenta as origens locais do Vite sem duplicar', () => {
    const origens = getAllowedOrigins({ NODE_ENV: 'development', CORS_ORIGINS: 'http://localhost:5173' });
    assert.deepEqual(origens, ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174']);
  });
});

describe('config/trustProxy', () => {
  it('interpreta booleanos, número de saltos, listas e nomes', () => {
    assert.equal(parseTrustProxy(), false);
    assert.equal(parseTrustProxy('false'), false);
    assert.equal(parseTrustProxy(''), false);
    assert.equal(parseTrustProxy('true'), true);
    assert.equal(parseTrustProxy('1'), 1);
    assert.deepEqual(parseTrustProxy('10.0.0.1, 10.0.0.2'), ['10.0.0.1', '10.0.0.2']);
    assert.equal(parseTrustProxy('loopback'), 'loopback');
  });
});

describe('scripts/guard-seed', () => {
  it('bloqueia seed em produção, salvo exceção explícita', () => {
    assert.match(capturarErro(() => assertSeedAllowed({ NODE_ENV: 'production' })).message, /Seed bloqueado em produção/);
    assert.match(capturarErro(() => assertSeedAllowed({ NODE_ENV: 'production', ALLOW_SEED_IN_PRODUCTION: 'false' })).message, /Seed bloqueado/);
    assert.doesNotThrow(() => assertSeedAllowed({ NODE_ENV: 'production', ALLOW_SEED_IN_PRODUCTION: 'true' }));
    assert.doesNotThrow(() => assertSeedAllowed({ NODE_ENV: 'development' }));
    assert.doesNotThrow(() => assertSeedAllowed({}));
  });
});

describe('middlewares/loginRateLimiter', () => {
  it('recusa configuração inválida na inicialização', () => {
    for (const env of [{ LOGIN_RATE_LIMIT_MAX: '0' }, { LOGIN_RATE_LIMIT_MAX: 'abc' }, { LOGIN_RATE_LIMIT_WINDOW_MS: '-5' }, { LOGIN_RATE_LIMIT_MAX: '1.5' }]) {
      assert.match(capturarErro(() => createLoginRateLimiter({ env })).message, /inteiro positivo/);
    }
  });

  it('responde 429 com mensagem em português depois do limite', async () => {
    const app = express();
    app.post('/login', createLoginRateLimiter({ env: { LOGIN_RATE_LIMIT_MAX: '2', LOGIN_RATE_LIMIT_WINDOW_MS: '60000' } }), (req, res) => res.json({ ok: true }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    try {
      const url = `http://127.0.0.1:${server.address().port}/login`;
      const status = [];
      let ultima;
      for (let i = 0; i < 3; i += 1) {
        ultima = await fetch(url, { method: 'POST' });
        status.push(ultima.status);
        if (i < 2) await ultima.arrayBuffer();
      }
      assert.deepEqual(status, [200, 200, 429]);
      assert.deepEqual(await ultima.json(), { error: 'Muitas tentativas. Aguarde antes de tentar novamente.' });
      assert.ok(ultima.headers.get('ratelimit'), 'deve enviar o cabeçalho RateLimit padronizado');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe('middlewares/errorHandler', () => {
  async function tratar(error, { headersSent = false } = {}) {
    const res = {
      headersSent,
      statusCode: null,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    let repassado = null;
    const saida = await capturarSaida(() => errorHandler(error, { requestId: 'req-1' }, res, (e) => { repassado = e; }));
    return { res, repassado, saida };
  }

  it('devolve a mensagem de erros de validação (4xx)', async () => {
    const erro = Object.assign(new Error('Status inválido.'), { status: 422 });
    const { res, saida } = await tratar(erro);
    assert.equal(res.statusCode, 422);
    assert.deepEqual(res.body, { error: 'Status inválido.' });
    assert.equal(saida.stderr, '', 'erros 4xx não devem ir para o log de erro');
  });

  it('traduz códigos do PostgreSQL para status e mensagens amigáveis', async () => {
    const casos = {
      '23505': [409, 'Já existe um registro com esses dados.'],
      '23503': [409, 'O registro está vinculado a outros dados.'],
      '23514': [422, 'Os dados informados não são válidos.'],
      '22P02': [422, 'O formato de um dos campos é inválido.'],
      '23502': [422, 'Preencha os campos obrigatórios.'],
      '22001': [422, 'Um dos campos excedeu o tamanho permitido.'],
      '40001': [409, 'O registro mudou durante a operação. Tente novamente.'],
    };
    for (const [code, [status, mensagem]] of Object.entries(casos)) {
      const erro = Object.assign(new Error('duplicate key value violates unique constraint "usuario_login_key"'), { code });
      const { res } = await tratar(erro);
      assert.equal(res.statusCode, status, code);
      assert.deepEqual(res.body, { error: mensagem }, code);
    }
  });

  it('esconde detalhes internos em erros 500 e registra só campos seguros', async () => {
    const erro = Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:5432 senha=abc'), { code: 'ECONNREFUSED' });
    const { res, saida } = await tratar(erro);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: 'Não foi possível concluir a operação. Tente novamente.' });
    const linha = JSON.parse(saida.stderr.trim());
    assert.equal(linha.event, 'request_failed');
    assert.equal(linha.requestId, 'req-1');
    assert.equal(linha.code, 'ECONNREFUSED');
    assert.ok(!saida.stderr.includes('10.0.0.5') && !saida.stderr.includes('senha=abc'));
  });

  it('repassa o erro quando a resposta já começou', async () => {
    const erro = new Error('tarde demais');
    const { res, repassado } = await tratar(erro, { headersSent: true });
    assert.equal(repassado, erro);
    assert.equal(res.statusCode, null);
  });
});

describe('utils/logger', () => {
  it('escreve JSON por linha e descarta campos fora da lista segura', async () => {
    const saida = await capturarSaida(() => logger.info('evento_teste', {
      requestId: 'abc', count: 2, senha: 'segredo', nome: 'Maria', telefone: '+5561999998888', method: { objeto: true },
    }));
    const linha = JSON.parse(saida.stdout.trim());
    assert.equal(linha.level, 'info');
    assert.equal(linha.event, 'evento_teste');
    assert.equal(linha.requestId, 'abc');
    assert.equal(linha.count, 2);
    assert.match(linha.timestamp, /^\d{4}-\d{2}-\d{2}T/);
    for (const campo of ['senha', 'nome', 'telefone', 'method']) assert.ok(!(campo in linha), campo);
    assert.ok(!saida.stdout.includes('segredo') && !saida.stdout.includes('Maria'));
  });

  it('envia erros para stderr e demais níveis para stdout', async () => {
    const saida = await capturarSaida(() => {
      logger.error('falhou', { code: 'X1' });
      logger.warn('atencao');
    });
    assert.equal(JSON.parse(saida.stderr.trim()).level, 'error');
    assert.equal(JSON.parse(saida.stdout.trim()).level, 'warn');
  });
});
