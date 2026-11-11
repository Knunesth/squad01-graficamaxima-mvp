import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const backendRoot = path.join(repoRoot, 'Grafica-Maxima-Backend');
const backendRequire = createRequire(path.join(backendRoot, 'package.json'));
const stage = process.argv[2] || 'depois';
const fastMode = process.env.DESIGN_QA_FAST === '1';
const testDatabaseUrl = process.env.DESIGN_QA_DATABASE_URL;
const adminPassword = process.env.DESIGN_QA_ADMIN_PASSWORD;
const attendantPassword = process.env.DESIGN_QA_ATTENDANT_PASSWORD;
const dimensions = fastMode
  ? [{ width: 390, height: 844 }]
  : stage === 'antes'
  ? [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]
  : [
      { width: 320, height: 568 }, { width: 390, height: 844 },
      { width: 768, height: 1024 }, { width: 1024, height: 768 },
      { width: 1440, height: 900 }, { width: 1920, height: 1080 },
    ];
const outputDir = path.join(repoRoot, 'qa-evidence', 'design', stage);
const evidence = [];
const accessibility = [];
const overflow = [];
const lighthouseResults = [];
const keyboardResults = [];
const runtimeErrors = [];
const routeCases = [
  ['dashboard', '/'], ['orcamentos', '/orcamentos'],
  ['novo-orcamento', '/orcamentos/novo'],
  ['buscar-cliente-orcamento', '/orcamentos/novo/cliente'],
  ['novo-cliente-orcamento', '/orcamentos/novo/cadastro'],
  ['montar-orcamento', '/orcamentos/novo/producao'],
  ['editar-orcamento', '/orcamentos/1/editar'],
  ['detalhe-orcamento', '/status-orcamento/1'],
  ['clientes', '/clientes'], ['catalogo', '/papel'],
  ['configuracoes', '/configuracao'], ['relatorios', '/relatorios'],
  ['usuarios', '/usuarios'],
];

if (!testDatabaseUrl) throw new Error('Defina DESIGN_QA_DATABASE_URL para PostgreSQL local.');
const databaseUrl = new URL(testDatabaseUrl);
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(databaseUrl.hostname)) throw new Error('Design QA aceita somente PostgreSQL em loopback.');
if (!adminPassword || !attendantPassword) throw new Error('Defina senhas fictícias em DESIGN_QA_ADMIN_PASSWORD e DESIGN_QA_ATTENDANT_PASSWORD.');
if (!['antes', 'depois'].includes(stage)) throw new Error('Use: node scripts/qa-a11y.js antes|depois');

const { Pool } = backendRequire('pg');
const adminPool = new Pool({ connectionString: testDatabaseUrl });
const schema = `phase0c_design_${Math.random().toString(16).slice(2, 12)}`;
const migrationFiles = [
  '001_initial_schema.sql', '002_data_finalizacao.sql', '003_relatorios.sql',
  '004_whatsapp.sql', '005_whatsapp_delivery_idempotency.sql',
  '006_report_query_indexes.sql', '008_user_token_version.sql',
];
let db;
let apiServer;
let viteProcess;
let browser;
let context;
let baseUrl;
let apiUrl;
const originalStdoutWrite = process.stdout.write.bind(process.stdout);

function freePort() {
  return new Promise((resolve, reject) => {
    const listener = createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const { port } = listener.address();
      listener.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitFor(url, child) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Servidor Vite encerrou antes de ficar disponível.');
    try { const response = await fetch(url); if (response.ok) return; } catch { /* aguardando inicialização */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Servidor local de design não respondeu em ${url}.`);
}

async function startTestStack() {
  const apiPort = await freePort();
  const frontendPort = await freePort();
  apiUrl = `http://127.0.0.1:${apiPort}`;
  baseUrl = `http://127.0.0.1:${frontendPort}`;
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  const scopedUrl = new URL(databaseUrl);
  scopedUrl.searchParams.set('options', `-csearch_path=${schema}`);
  Object.assign(process.env, {
    DATABASE_URL: scopedUrl.toString(),
    JWT_SECRET: 'design-qa-only-secret-not-used-in-production',
    NODE_ENV: 'test', PORT: String(apiPort),
    CORS_ORIGINS: `${baseUrl},http://localhost:${frontendPort}`,
    WHATSAPP_MODE: 'mock', WHATSAPP_DEFAULT_RECIPIENT: '+15551234567',
  });

  db = backendRequire('./src/config/db');
  for (const filename of migrationFiles) {
    const sql = await fs.readFile(path.join(backendRoot, 'database', 'migrations', filename), 'utf8');
    await db.query(sql);
  }
  const seed = spawnSync(process.execPath, [path.join(backendRoot, 'seed.js')], {
    cwd: backendRoot,
    encoding: 'utf8',
    env: {
      ...process.env, DATABASE_URL: scopedUrl.toString(),
      ADMIN_LOGIN: 'qa-admin', ADMIN_EMAIL: 'qa-admin@example.test', ADMIN_PASSWORD: adminPassword,
      ATTENDANT_LOGIN: 'qa-attendant', ATTENDANT_EMAIL: 'qa-attendant@example.test', ATTENDANT_PASSWORD: attendantPassword,
    },
  });
  if (seed.status !== 0) throw new Error(`Seed fictício falhou (${seed.status}).`);

  apiServer = backendRequire('./src/app').createApp().listen(apiPort, '127.0.0.1');
  await new Promise((resolve) => apiServer.once('listening', resolve));
  process.stdout.write = () => true;
  viteProcess = spawn(process.execPath, [path.join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'], {
    cwd: frontendRoot,
    env: { ...process.env, VITE_API_URL: apiUrl },
    stdio: 'ignore', windowsHide: true,
  });
  await waitFor(`${baseUrl}/login`, viteProcess);
}

async function save(page, name, viewport) {
  await page.waitForTimeout(350);
  const dimensionsNow = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  if (dimensionsNow.document > dimensionsNow.viewport) overflow.push({ screen: name, width: viewport.width, documentWidth: dimensionsNow.document });
  const filename = `${name}__${viewport.width}x${viewport.height}.png`;
  const screenshotPath = path.join(outputDir, filename);
  await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' });
  evidence.push(path.relative(repoRoot, screenshotPath).replaceAll('\\', '/'));
  if (stage === 'depois') {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    accessibility.push({ screen: name, width: viewport.width, violations: results.violations.map((item) => ({
      id: item.id, impact: item.impact, description: item.description, help: item.help, helpUrl: item.helpUrl,
      nodes: item.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    })) });
  }
}

async function navigate(page, route, viewport, name) {
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  if (route === '/relatorios') {
    try {
      await page.locator('.reports-page').waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      const pageText = await page.locator('body').innerText().catch(() => '');
      throw new Error(`Tela /relatorios não renderizou; URL=${page.url()}; texto=${pageText}; erros=${runtimeErrors.join(' | ')}`);
    }
  }
  await save(page, name, viewport);
}

async function measureLighthouse(route, device, cookie) {
  const mobile = device === 'mobile';
  const chrome = await launchChrome({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  try {
    const result = await lighthouse(`${baseUrl}${route}`, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['accessibility', 'best-practices', 'performance'],
      formFactor: mobile ? 'mobile' : 'desktop',
      screenEmulation: mobile
        ? { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false }
        : { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
      throttlingMethod: 'simulate',
      extraHeaders: cookie ? { Cookie: cookie } : undefined,
    });
    const lhr = result.lhr || result;
    lighthouseResults.push({
      route, device,
      scores: Object.fromEntries(Object.entries(lhr.categories).map(([key, category]) => [key, Math.round(category.score * 100)])),
      metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'cumulative-layout-shift', 'speed-index'].map((key) => [key, lhr.audits[key]?.numericValue ?? null])),
    });
  } finally {
    await chrome.kill();
  }
}

async function cleanup() {
  if (context) await context.close();
  if (browser) await browser.close();
  if (viteProcess && viteProcess.exitCode === null) { viteProcess.kill(); await new Promise((resolve) => viteProcess.once('exit', resolve)); }
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  if (db) await db.end();
  try { await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } catch { /* o PostgreSQL pode não ter iniciado */ }
  await adminPool.end();
  process.stdout.write = originalStdoutWrite;
}

let summary;
try {
  await fs.mkdir(outputDir, { recursive: true });
  await startTestStack();
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: dimensions[0], deviceScaleFactor: 1 });
  const publicPage = await context.newPage();
  for (const viewport of dimensions) {
    await navigate(publicPage, '/login', viewport, 'login');
    await navigate(publicPage, '/cadastro', viewport, 'cadastro');
  }

  const loginPage = await context.newPage();
  loginPage.on('pageerror', (error) => runtimeErrors.push(String(error)));
  loginPage.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
  await loginPage.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await loginPage.getByLabel('Login').focus();
  await loginPage.keyboard.type('qa-admin');
  await loginPage.getByLabel('Senha').focus();
  await loginPage.keyboard.type(adminPassword);
  await loginPage.keyboard.press('Enter');
  await loginPage.waitForURL(`${baseUrl}/`);
  for (const viewport of dimensions) {
    for (const [name, route] of routeCases) await navigate(loginPage, route, viewport, name);
    await loginPage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await loginPage.getByRole('button', { name: 'Calculadora de m²' }).click();
    await save(loginPage, 'calculadora-aberta', viewport);
    await loginPage.locator('.btn-fechar-modal').click();
    await loginPage.goto(`${baseUrl}/papel`, { waitUntil: 'domcontentloaded' });
    const editCategory = loginPage.getByRole('button', { name: /Editar materiais em Offset/ });
    await editCategory.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (await editCategory.count()) {
      await editCategory.click();
      await save(loginPage, 'modal-material', viewport);
      await loginPage.getByRole('button', { name: 'Fechar' }).click();
    }
    await loginPage.goto(`${baseUrl}/orcamentos`, { waitUntil: 'domcontentloaded' });
    await loginPage.getByLabel('Buscar orçamento').fill('QA sem resultados');
    await loginPage.getByRole('button', { name: 'Filtrar' }).click();
    await save(loginPage, 'orcamentos-vazio', viewport);
  }

  async function pressEnter(locator) {
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.focus();
    await loginPage.keyboard.press('Enter');
  }
  async function typeByLabel(label, value) {
    const field = loginPage.getByLabel(label, { exact: true });
    await field.focus();
    await loginPage.keyboard.press('Control+A');
    await loginPage.keyboard.type(value);
  }

  // Keyboard-only E2E using a unique fake client and the temporary QA schema.
  const qaClient = `QA design ${Date.now()}`;
  const qaEmail = `design-${Date.now()}@example.test`;
  await loginPage.goto(`${baseUrl}/clientes`, { waitUntil: 'domcontentloaded' });
  await typeByLabel('Nome', qaClient);
  await typeByLabel('Telefone', '61999991234');
  await typeByLabel('E-mail', qaEmail);
  await typeByLabel('CPF ou CNPJ', '12345678901');
  await pressEnter(loginPage.getByRole('button', { name: 'Salvar', exact: true }));
  await loginPage.getByText('Cliente cadastrado.', { exact: true }).waitFor({ state: 'visible' });
  keyboardResults.push({ flow: 'criar cliente', result: 'passou', method: 'teclado' });

  await loginPage.goto(`${baseUrl}/orcamentos/novo/cliente`, { waitUntil: 'domcontentloaded' });
  await typeByLabel('E-mail', qaEmail);
  await typeByLabel('CPF ou CNPJ', '12345678901');
  await pressEnter(loginPage.getByRole('button', { name: 'Selecionar e continuar' }));
  await loginPage.waitForURL(`${baseUrl}/orcamentos/novo/producao`);
  const materialSelect = loginPage.getByRole('combobox', { name: 'Material 1' });
  await materialSelect.focus();
  await loginPage.keyboard.press('ArrowDown');
  await loginPage.keyboard.press('Enter');
  await pressEnter(loginPage.getByRole('button', { name: 'Salvar orçamento' }));
  await loginPage.waitForURL(`${baseUrl}/orcamentos`);
  await loginPage.getByText('Orçamento salvo com sucesso.', { exact: true }).waitFor({ state: 'visible' });
  keyboardResults.push({ flow: 'criar orçamento', result: 'passou', method: 'teclado' });

  const latestRow = loginPage.getByRole('row').nth(1);
  const statusButton = latestRow.getByRole('button').first();
  await pressEnter(statusButton);
  await latestRow.getByText('Aprovado', { exact: true }).waitFor({ state: 'visible' });
  keyboardResults.push({ flow: 'mudar status do orçamento', result: 'passou', method: 'teclado' });

  await loginPage.goto(`${baseUrl}/relatorios`, { waitUntil: 'domcontentloaded' });
  await loginPage.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent.includes('Atualizar relatório') && !button.disabled), null, { timeout: 15000 });
  await pressEnter(loginPage.getByRole('button', { name: 'Atualizar relatório' }));
  await loginPage.locator('.report-period-heading').waitFor({ state: 'visible' });
  keyboardResults.push({ flow: 'gerar relatório', result: 'passou', method: 'teclado' });
  await pressEnter(loginPage.getByRole('button', { name: /Enviar por WhatsApp agora/ }));
  await loginPage.getByText(/Envio simulado e registrado|Solicitação enviada aos destinatários ativos|O envio falhou para todos/, { exact: false }).waitFor({ state: 'visible', timeout: 15000 });
  keyboardResults.push({ flow: 'enviar relatório mock', result: 'passou', method: 'teclado' });

  await loginPage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await loginPage.setViewportSize({ width: 390, height: 844 });
  const calculatorToggle = loginPage.getByRole('button', { name: 'Calculadora de m²' });
  await pressEnter(calculatorToggle);
  const calculatorDialog = loginPage.getByRole('dialog', { name: 'Calculadora de M²' });
  await calculatorDialog.waitFor({ state: 'visible' });
  if (!(await calculatorDialog.locator(':focus').count())) throw new Error('A calculadora não recebeu foco inicial.');
  await loginPage.keyboard.press('Escape');
  await calculatorDialog.waitFor({ state: 'hidden' });
  if (!(await calculatorToggle.evaluate((element) => document.activeElement === element))) throw new Error('O foco não retornou ao botão da calculadora após fechar.');
  keyboardResults.push({ flow: 'modal da calculadora (foco e Esc)', result: 'passou', method: 'teclado' });
  await pressEnter(loginPage.getByRole('button', { name: 'Abrir menu' }));
  if (await loginPage.getByRole('navigation', { name: 'Navegação principal' }).isVisible()) {
    await loginPage.keyboard.press('Escape');
    keyboardResults.push({ flow: 'menu mobile (abrir e Esc)', result: 'passou', method: 'teclado' });
  } else throw new Error('Menu mobile não abriu pelo teclado.');

  await loginPage.setViewportSize({ width: dimensions.at(-1).width, height: dimensions.at(-1).height });

  const sessionCookie = (await context.cookies(baseUrl)).find((cookie) => cookie.name === 'grafica_session')?.value;
  if (!fastMode) {
    for (const device of ['mobile', 'desktop']) {
      await measureLighthouse('/login', device);
      await measureLighthouse('/', device, sessionCookie);
    }
  }

  const reportPath = path.join(outputDir, 'qa-summary.json');
  await fs.writeFile(reportPath, JSON.stringify({ stage, baseUrl, dimensions, evidence, overflow, accessibility, keyboard: keyboardResults, runtimeErrors, lighthouse: lighthouseResults }, null, 2));
  const violations = accessibility.flatMap((screen) => screen.violations.map(({ id, impact }) => ({ id, impact })));
  summary = { stage, screenshots: evidence.length, overflowCount: overflow.length, accessibilityCount: accessibility.length, axeViolations: violations.length, axeByImpact: Object.fromEntries(['critical', 'serious', 'moderate', 'minor'].map((impact) => [impact, violations.filter((item) => item.impact === impact).length])), keyboard: keyboardResults, lighthouse: lighthouseResults, reportPath: path.relative(repoRoot, reportPath) };
} finally {
  await cleanup();
}
console.log(JSON.stringify(summary, null, 2));
