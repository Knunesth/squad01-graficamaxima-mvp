require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Pool } = require('pg');

const rawTestUrl = process.env.PHASE7_TEST_DATABASE_URL;
if (!rawTestUrl) throw new Error('Defina PHASE7_TEST_DATABASE_URL para um PostgreSQL local de teste. DATABASE_URL não será usado automaticamente.');
const baseUrl = new URL(rawTestUrl);
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(baseUrl.hostname)) throw new Error('O E2E da Fase 7 aceita somente PostgreSQL em loopback; nenhum banco remoto será acessado.');

const schema = `phase7_e2e_${crypto.randomBytes(5).toString('hex')}`;
const adminPool = new Pool({ connectionString: rawTestUrl });
const migrationFiles = [
  '001_initial_schema.sql', '002_data_finalizacao.sql', '003_relatorios.sql',
  '004_whatsapp.sql', '005_whatsapp_delivery_idempotency.sql',
  '006_report_query_indexes.sql', '008_user_token_version.sql',
];
let db;
let server;
let stopScheduler;
const temporaryFiles = [];
let capturedLogs = '';
const originalStdoutWrite = process.stdout.write.bind(process.stdout);

async function request(endpoint, route, options = {}, expectedStatus = 200, cookie) {
  const response = await fetch(`${endpoint}${route}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
  });
  assert.equal(response.status, expectedStatus, `${route}: esperado HTTP ${expectedStatus}, recebido ${response.status}`);
  return response;
}

async function login(endpoint, username, password) {
  const response = await request(endpoint, '/api/auth/login', {
    method: 'POST', body: JSON.stringify({ login: username, senha: password }),
  });
  return response.headers.get('set-cookie').split(';')[0];
}

async function testCatalog(importer) {
  const counts = {};
  for (const type of Object.keys(importer.specs)) {
    const template = path.join(__dirname, '..', 'docs', 'modelos-catalogo', `${type}.csv`);
    const providedTemplate = await fs.readFile(template, 'utf8');
    const templateFile = path.join(os.tmpdir(), `${schema}-${type}-template.csv`);
    temporaryFiles.push(templateFile);
    await fs.writeFile(templateFile, providedTemplate);
    process.argv = ['node', 'import-catalog', '--type', type, '--file', templateFile, '--dry-run'];
    const templateResult = await importer.main();
    assert.equal(templateResult.erros.length, 0, `${type}: linhas de exemplo válidas`);
    assert.equal(templateResult.exemplosIgnorados, 2, `${type}: exemplos devem ser ignorados`);
    assert.equal(templateResult.inseridos, 0, `${type}: dry-run não deve gravar`);

    const dataFile = path.join(os.tmpdir(), `${schema}-${type}-data.csv`);
    temporaryFiles.push(dataFile);
    await fs.writeFile(dataFile, providedTemplate.replace(/,EXEMPLO/g, ','));
    process.argv = ['node', 'import-catalog', '--type', type, '--file', dataFile, '--dry-run'];
    const preview = await importer.main();
    assert.equal(preview.erros.length, 0, `${type}: dados válidos no dry-run`);
    process.argv = ['node', 'import-catalog', '--type', type, '--file', dataFile];
    const first = await importer.main();
    const second = await importer.main();
    assert.equal(first.inseridos, 2, `${type}: primeira importação`);
    assert.equal(second.inseridos, 0, `${type}: reimportação sem duplicatas`);
    assert.equal(second.atualizados, 2, `${type}: reimportação atualiza os existentes`);
    counts[type] = 2;
  }
  const invalid = importer.normalizeRow(importer.specs['precos-m2'], { tipo: 'Teste', preco_base_m2: 'não-numérico' });
  assert(invalid.errors.some((message) => message.includes('preco_base_m2')));
  return counts;
}

async function run() {
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  const scopedUrl = new URL(baseUrl);
  scopedUrl.searchParams.set('options', `-csearch_path=${schema}`);
  process.env.DATABASE_URL = scopedUrl.toString();
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  process.env.NODE_ENV = 'test';
  process.env.CORS_ORIGINS = 'http://localhost:5173';
  process.env.WHATSAPP_MODE = 'mock';
  process.env.WHATSAPP_DEFAULT_RECIPIENT = '+15551234567';
  process.env.REPORT_TIMEZONE = 'America/Sao_Paulo';
  process.env.REPORT_WEEKLY_CRON = '0 8 * * 1';
  process.env.REPORT_MONTHLY_CRON = '0 8 1 * *';
  process.stdout.write = function capture(chunk, ...args) {
    capturedLogs += String(chunk);
    return originalStdoutWrite(chunk, ...args);
  };

  db = require('../src/config/db');
  for (const filename of migrationFiles) {
    const sql = await fs.readFile(path.join(__dirname, '..', 'database', 'migrations', filename), 'utf8');
    await db.query(sql);
  }

  const importer = require('./import-catalog');
  const catalogCounts = await testCatalog(importer);
  const finalCounts = await db.query(`
    SELECT (SELECT count(*) FROM material) AS materials,
           (SELECT count(*) FROM papel) AS papers,
           (SELECT count(*) FROM impressao) AS impressions,
           (SELECT count(*) FROM acabamento) AS finishes,
           (SELECT count(*) FROM corte) AS cuts,
           (SELECT count(*) FROM preco_m2) AS square_meter_prices`);
  assert.deepEqual(Object.values(finalCounts.rows[0]).map(Number), [2, 2, 2, 2, 2, 2]);

  const { hashPassword } = require('../src/controllers/AuthController');
  const admin = await db.query(
    "INSERT INTO usuario (nome, login, senha_hash, tipo, ativo) VALUES ('QA admin', 'qa_admin', $1, 'admin', true) RETURNING id_usuario",
    [await hashPassword('qa-admin-password-1')],
  );
  const attendant = await db.query(
    "INSERT INTO usuario (nome, login, senha_hash, tipo, ativo) VALUES ('QA attendant', 'qa_attendant', $1, 'atendente', true) RETURNING id_usuario",
    [await hashPassword('qa-attendant-password-1')],
  );
  server = require('../src/app').createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  const oldAttendantCookie = await login(endpoint, 'qa_attendant', 'qa-attendant-password-1');
  await request(endpoint, '/api/auth/password', {
    method: 'POST', body: JSON.stringify({ senha_atual: 'wrong-password', nova_senha: 'qa-attendant-password-2' }),
  }, 401, oldAttendantCookie);
  await request(endpoint, '/api/auth/password', {
    method: 'POST', body: JSON.stringify({ senha_atual: 'qa-attendant-password-1', nova_senha: 'qa-attendant-password-2' }),
  }, 200, oldAttendantCookie);
  await request(endpoint, '/api/clientes', {}, 401, oldAttendantCookie);
  const attendantCookie = await login(endpoint, 'qa_attendant', 'qa-attendant-password-2');
  await request(endpoint, `/api/auth/usuarios/${attendant.rows[0].id_usuario}/senha`, {
    method: 'PATCH', body: JSON.stringify({ nova_senha: 'qa-attendant-password-3' }),
  }, 403, attendantCookie);
  const adminCookie = await login(endpoint, 'qa_admin', 'qa-admin-password-1');
  await request(endpoint, `/api/auth/usuarios/${attendant.rows[0].id_usuario}/senha`, {
    method: 'PATCH', body: JSON.stringify({ nova_senha: 'qa-attendant-password-3' }),
  }, 200, adminCookie);
  await request(endpoint, '/api/clientes', {}, 401, attendantCookie);
  const resetCookie = await login(endpoint, 'qa_attendant', 'qa-attendant-password-3');
  await request(endpoint, '/api/clientes', {}, 200, resetCookie);

  const unhealthy = await request(endpoint, '/health', {}, 503);
  assert.deepEqual((await unhealthy.json()).checks, { database: 'ok', scheduler: 'inactive' });
  const { runReportCatchup, startReportScheduler } = require('../src/services/reporting/reportScheduler');
  const catchup = await runReportCatchup({ env: process.env });
  assert.equal(catchup.locked, true);
  assert.equal(catchup.value.length, 2);
  stopScheduler = startReportScheduler(process.env);
  const catchupDeadline = Date.now() + 2000;
  while (!capturedLogs.includes('"event":"report_catchup_checked"') && Date.now() < catchupDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert(capturedLogs.includes('"event":"report_catchup_checked"'), 'catch-up iniciado pelo scheduler deve terminar');
  const deliveryCount = await db.query('SELECT count(*)::int AS total FROM relatorio_envio');
  assert.equal(deliveryCount.rows[0].total, 2, 'dois catch-ups não devem duplicar os dois envios mock');
  const healthy = await request(endpoint, '/health');
  assert.deepEqual((await healthy.json()).checks, { database: 'ok', scheduler: 'active' });
  stopScheduler();
  stopScheduler = null;
  const stopped = await request(endpoint, '/health', {}, 503);
  assert.deepEqual((await stopped.json()).checks, { database: 'ok', scheduler: 'inactive' });

  const { connectionOptions } = require('./backup-db');
  const backupOptions = connectionOptions('postgresql://qa_user:qa_password@localhost:5432/qa_database');
  assert(!backupOptions.args.join(' ').includes('qa_password'));
  assert.equal(backupOptions.password, 'qa_password');
  assert(!capturedLogs.includes('QA admin') && !capturedLogs.includes('qa_attendant'));
  assert(!capturedLogs.includes('+15551234567'));
  return { catalogCounts, password: 'change and admin reset; old sessions rejected', health: '503 inactive / 200 active / 503 stopped', catchup: 'two recent periods generated and delivered once in mock', backup: 'password excluded from pg_dump arguments' };
}

run()
  .then((summary) => originalStdoutWrite(`${JSON.stringify({ result: 'passed', ...summary }, null, 2)}\n`))
  .catch((error) => { originalStdoutWrite(`Fase 7 E2E falhou: ${error.message}\n`); process.exitCode = 1; })
  .finally(async () => {
    if (stopScheduler) stopScheduler();
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.end();
    for (const filename of temporaryFiles) await fs.rm(filename, { force: true });
    try { await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await adminPool.end(); }
    process.stdout.write = originalStdoutWrite;
  });
