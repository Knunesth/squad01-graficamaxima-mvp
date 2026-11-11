// Infraestrutura dos testes de integração (API real + PostgreSQL real).
//
// Segurança dos dados:
//   - só roda se TEST_DATABASE_URL estiver definida (DATABASE_URL nunca é usada);
//   - só aceita banco em loopback (localhost/127.0.0.1/::1);
//   - cada arquivo de teste cria um schema aleatório `teste_*`, aplica as
//     migrations nele e o remove ao final. Nada é gravado no schema `public`.
require('./env');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

const urlBruta = process.env.TEST_DATABASE_URL;
const LOOPBACK = ['localhost', '127.0.0.1', '::1', '[::1]'];

function motivoParaPular() {
  if (!urlBruta) return 'defina TEST_DATABASE_URL (PostgreSQL local) para rodar os testes de integração';
  let host;
  try {
    host = new URL(urlBruta).hostname;
  } catch {
    return 'TEST_DATABASE_URL não é uma URL válida';
  }
  if (!LOOPBACK.includes(host)) return 'TEST_DATABASE_URL precisa apontar para loopback; bancos remotos são recusados';
  return false;
}

// A 007 habilita RLS em todas as tabelas do schema `public`; fica de fora
// porque o teste trabalha apenas dentro do próprio schema temporário.
const MIGRATIONS_FORA_DO_SCHEMA = new Set(['007_enable_rls.sql']);

async function iniciar(envExtra = {}) {
  const schema = `teste_${crypto.randomBytes(6).toString('hex')}`;
  const adminPool = new Pool({ connectionString: urlBruta, max: 1 });
  await adminPool.query(`CREATE SCHEMA "${schema}"`);

  const urlDoSchema = new URL(urlBruta);
  urlDoSchema.searchParams.set('options', `-csearch_path=${schema}`);
  Object.assign(process.env, { DATABASE_URL: urlDoSchema.toString() }, envExtra);

  const originais = {
    stdout: process.stdout.write.bind(process.stdout),
    stderr: process.stderr.write.bind(process.stderr),
  };
  const logs = [];
  const filtrar = (original) => (chunk, ...args) => {
    const texto = String(chunk);
    if (!texto.startsWith('{"timestamp"')) return original(chunk, ...args);
    logs.push(texto);
    return true;
  };
  process.stdout.write = filtrar(originais.stdout);
  process.stderr.write = filtrar(originais.stderr);

  const db = require('../../src/config/db');
  const { hashPassword } = require('../../src/services/password');
  const diretorio = path.join(__dirname, '..', '..', 'database', 'migrations');
  const arquivos = (await fs.readdir(diretorio)).filter((nome) => nome.endsWith('.sql') && !MIGRATIONS_FORA_DO_SCHEMA.has(nome)).sort();
  for (const arquivo of arquivos) await db.query(await fs.readFile(path.join(diretorio, arquivo), 'utf8'));

  const server = require('../../src/app').createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  /** Faz uma chamada HTTP e devolve { status, body, headers, buffer }. */
  async function req(rota, { method = 'GET', body, cookie, headers = {}, binario = false } = {}) {
    const resposta = await fetch(base + rota, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const buffer = Buffer.from(await resposta.arrayBuffer());
    let json = null;
    if (!binario) {
      try { json = JSON.parse(buffer.toString('utf8')); } catch { json = null; }
    }
    return { status: resposta.status, body: json, headers: resposta.headers, buffer };
  }

  async function criarUsuario({ login, senha, tipo = 'atendente', ativo = true, email = null, nome = login }) {
    const { rows } = await db.query(
      'INSERT INTO usuario (nome, email, login, senha_hash, tipo, ativo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_usuario',
      [nome, email, login, await hashPassword(senha), tipo, ativo],
    );
    return rows[0].id_usuario;
  }

  /** Faz login e devolve o cookie de sessão pronto para o cabeçalho Cookie. */
  async function login(usuario, senha) {
    const resposta = await req('/api/auth/login', { method: 'POST', body: { login: usuario, senha } });
    if (resposta.status !== 200) throw new Error(`Login de ${usuario} falhou com HTTP ${resposta.status}`);
    return resposta.headers.get('set-cookie').split(';')[0];
  }

  async function encerrar() {
    await new Promise((resolve) => server.close(resolve));
    server.closeAllConnections?.();
    await db.end();
    try {
      await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await adminPool.end();
      process.stdout.write = originais.stdout;
      process.stderr.write = originais.stderr;
    }
  }

  return { schema, db, req, login, criarUsuario, encerrar, logs, base };
}

const SENHAS = { admin: 'senha-admin-de-teste-01', atendente: 'senha-atendente-teste-01' };

/** Cria um admin e um atendente ativos e devolve os cookies de sessão. */
async function criarSessoes(ctx) {
  const idAdmin = await ctx.criarUsuario({ login: 'admin_teste', senha: SENHAS.admin, tipo: 'admin', email: 'admin@teste.example', nome: 'Admin de Teste' });
  const idAtendente = await ctx.criarUsuario({ login: 'atendente_teste', senha: SENHAS.atendente, nome: 'Atendente de Teste' });
  return {
    idAdmin,
    idAtendente,
    admin: await ctx.login('admin_teste', SENHAS.admin),
    atendente: await ctx.login('atendente_teste', SENHAS.atendente),
  };
}

module.exports = { iniciar, criarSessoes, motivoParaPular, SENHAS, urlBruta };
