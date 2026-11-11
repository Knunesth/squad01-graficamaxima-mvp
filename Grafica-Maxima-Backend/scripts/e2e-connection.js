require('dotenv').config();
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { Pool } = require('pg');
const { todayAtTimezone } = require('../src/services/reporting/period');
const { sendReport } = require('../src/services/whatsapp/deliveryService');

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || !process.env.ADMIN_PASSWORD || !process.env.ATTENDANT_PASSWORD) {
  throw new Error('Defina DATABASE_URL, JWT_SECRET e senhas de admin e atendente antes do E2E.');
}

const apiUrl = `http://localhost:${Number(process.env.PORT) || 3301}`;
const frontUrl = process.env.TEST_FRONT_URL || 'http://localhost:5173';
const tag = `TESTE_${randomBytes(5).toString('hex')}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let cookie;
let clientId;
let quoteId;
let reportDate;
let recipientId;
const deliveryIds = [];
const testPhone = `+1${Array.from(randomBytes(10)).map((value) => value % 10).join('')}`;

async function request(path, options = {}, expected = 200) {
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
  assert.equal(response.headers.get('access-control-allow-origin'), frontUrl);
  if (response.headers.get('content-type')?.includes('application/json')) {
    const body = await response.json();
    console.log(`${options.method || 'GET'} ${path}: ${response.status}`);
    return { response, body };
  }
  const body = Buffer.from(await response.arrayBuffer());
  console.log(`${options.method || 'GET'} ${path}: ${response.status}`);
  return { response, body };
}

async function cleanup() {
  if (deliveryIds.length) {
    await pool.query('DELETE FROM relatorio_envio WHERE id_envio = ANY($1::int[])', [deliveryIds]);
  }
  if (recipientId) {
    await pool.query('UPDATE whatsapp_destinatario SET ativo = false WHERE id_destinatario = $1', [recipientId]);
  }
  if (quoteId) {
    await pool.query('DELETE FROM acabamento_item WHERE id_item IN (SELECT id_item FROM item WHERE id_orcamento = $1)', [quoteId]);
    await pool.query('DELETE FROM item_corte WHERE id_item IN (SELECT id_item FROM item WHERE id_orcamento = $1)', [quoteId]);
    await pool.query('DELETE FROM servico_item WHERE id_item IN (SELECT id_item FROM item WHERE id_orcamento = $1)', [quoteId]);
    await pool.query('DELETE FROM item WHERE id_orcamento = $1', [quoteId]);
    await pool.query('DELETE FROM documento WHERE id_orcamento = $1', [quoteId]);
    await pool.query("DELETE FROM historico_log WHERE tabela_afetada = 'orcamento' AND id_registro = $1", [quoteId]);
    await pool.query('DELETE FROM orcamento WHERE id_orcamento = $1', [quoteId]);
  }
  if (clientId) await pool.query('DELETE FROM cliente WHERE id_cliente = $1', [clientId]);
}

async function run() {
  try {
    const front = await fetch(frontUrl);
    assert.equal(front.status, 200);
    console.log('Frontend: 200');
    await request('/health');
    const login = await request('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ login: process.env.ADMIN_LOGIN || 'admin', senha: process.env.ADMIN_PASSWORD }),
    });
    cookie = login.response.headers.get('set-cookie')?.split(';')[0];
    assert.match(cookie || '', /^grafica_session=/);
    const adminId = login.body.usuario.id_usuario;
    await request('/api/auth/me');

    const materialList = await request('/api/materiais');
    assert.ok(materialList.body.itens.length > 0);
    const prices = await request('/api/calculo/tipos');
    assert.ok(prices.body.tipos.length > 0);
    await request('/api/dashboard');
    console.log('Materiais e dashboard: OK');

    const customer = await request('/api/clientes', {
      method: 'POST', body: JSON.stringify({
        nome: tag, telefone: '61999999999', email: `${tag.toLowerCase()}@example.test`,
        cpf_cnpj: `99${randomBytes(6).toString('hex').replace(/[a-f]/g, '1').slice(0, 9)}`,
      }),
    }, 201);
    clientId = customer.body.id_cliente;

    const type = prices.body.tipos[0];
    const calculation = await request('/api/calculo/metro-quadrado/simulacao', {
      method: 'POST', body: JSON.stringify({ tipo_servico: type.tipo, largura: 1, altura: 1, quantidade: 2 }),
    });
    assert.equal(Number(calculation.body.calculo.preco_por_m2), Number(type.preco_base_m2));

    const material = materialList.body.itens[0];
    const created = await request('/api/orcamentos', {
      method: 'POST', body: JSON.stringify({
        id_cliente: clientId, observacoes: tag, data_validade: null, prazo_entrega: null,
        desconto_tipo: 'percentual', desconto_valor: 0,
        itens: [{ id_material: material.id_material, tipo_produto: material.nome, quantidade: 2, valor_unitario: calculation.body.calculo.valor_unitario }],
      }),
    }, 201);
    quoteId = created.body.id_orcamento;
    let quote = await request(`/api/orcamentos/${quoteId}`);
    assert.equal(quote.body.itens.length, 1);
    await request(`/api/orcamentos/status-orcamento/${quoteId}`, {
      method: 'PUT', body: JSON.stringify({ status: 'Aprovado', versao: quote.body.versao }),
    });
    quote = await request(`/api/orcamentos/${quoteId}`);
    await request(`/api/orcamentos/status-orcamento/${quoteId}`, {
      method: 'PUT', body: JSON.stringify({ status: 'Finalizado', versao: quote.body.versao }),
    });
    const finalized = await pool.query('SELECT data_finalizacao FROM orcamento WHERE id_orcamento = $1', [quoteId]);
    assert.ok(finalized.rows[0].data_finalizacao);
    const pdf = await request(`/api/orcamentos/${quoteId}/pdf`);
    assert.ok(pdf.body.subarray(0, 4).toString() === '%PDF');
    console.log(`Orçamento ${quoteId}: criação, aprovação, finalização e PDF OK`);

    reportDate = todayAtTimezone();
    const report = await request('/api/reports/generate', {
      method: 'POST', body: JSON.stringify({ type: 'weekly', date: reportDate }),
    }, 201);
    assert.ok(report.body.id_relatorio);
    assert.ok(report.body.resumo.includes('Semana de'));
    assert.ok(report.body.dados.metrics.finalizedSales >= 1);
    assert.ok(report.body.dados.metrics.revenue > 0);
    await request(`/api/reports/${report.body.id_relatorio}`);
    const history = await request('/api/reports/history?type=weekly');
    assert.ok(history.body.itens.some((item) => item.id_relatorio === report.body.id_relatorio));
    console.log(`Relatório semanal ${report.body.id_relatorio}: métricas, resumo e histórico OK`);
    const monthlyReport = await request('/api/reports/generate', {
      method: 'POST', body: JSON.stringify({ type: 'monthly', date: reportDate }),
    }, 201);
    assert.ok(monthlyReport.body.dados.metrics.finalizedSales >= 1);
    assert.ok(monthlyReport.body.resumo.includes('Mês de'));
    console.log(`Relatório mensal ${monthlyReport.body.id_relatorio}: comparação de período OK`);

    const recipients = await request('/api/reports/recipients');
    assert.equal(recipients.body.mode, 'mock');
    await request('/api/reports/recipients', {
      method: 'POST', body: JSON.stringify({ nome: tag, telefone: '61999999999' }),
    }, 422);
    const testRecipient = await request('/api/reports/recipients', {
      method: 'POST', body: JSON.stringify({ nome: tag, telefone: testPhone }),
    }, 201);
    recipientId = testRecipient.body.id_destinatario;
    await request('/api/reports/recipients', {
      method: 'POST', body: JSON.stringify({ nome: tag, telefone: testPhone }),
    }, 409);

    let providerCalls = 0;
    const fakeProviderFactory = () => ({
      async sendReport() {
        providerCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 250));
        return { mode: 'mock', messageId: 'e2e-concurrent-reservation' };
      },
    });
    const concurrentSends = await Promise.all([
      sendReport(report.body, { providerFactory: fakeProviderFactory }),
      sendReport(report.body, { providerFactory: fakeProviderFactory }),
    ]);
    assert.equal(providerCalls, 1);
    const reservations = await pool.query(
      'SELECT id_envio, status FROM relatorio_envio WHERE id_relatorio = $1 AND destinatario = $2',
      [report.body.id_relatorio, testPhone],
    );
    assert.equal(reservations.rowCount, 1);
    assert.equal(reservations.rows[0].status, 'sent');
    deliveryIds.push(reservations.rows[0].id_envio);
    console.log(`Reserva concorrente: ${providerCalls} chamada ao provedor para ${concurrentSends.length} execuções.`);

    await pool.query(
      "UPDATE relatorio_envio SET status = 'pending', criado_em = now() - interval '6 minutes' WHERE id_envio = $1",
      [reservations.rows[0].id_envio],
    );
    const staleHistory = await request(`/api/reports/${report.body.id_relatorio}/deliveries`);
    assert.equal(staleHistory.body.itens.find((item) => item.id_envio === reservations.rows[0].id_envio).status, 'unknown');
    await request(`/api/reports/${report.body.id_relatorio}/send`, { method: 'POST', body: JSON.stringify({}) }, 409);
    const recovered = await request(`/api/reports/${report.body.id_relatorio}/send`, {
      method: 'POST', body: JSON.stringify({ confirmResend: true }),
    });
    assert.equal(recovered.body.results[0].status, 'sent');
    console.log('Reserva pendente antiga virou desconhecida; reenvio manual confirmado: OK.');

    const delivery = await request(`/api/reports/${monthlyReport.body.id_relatorio}/send`, {
      method: 'POST', body: JSON.stringify({}),
    });
    assert.equal(delivery.body.mode, 'mock');
    assert.equal(delivery.body.results[0].status, 'sent');
    assert.equal(delivery.body.results[0].tentativas, 1);
    deliveryIds.push(delivery.body.results[0].id_envio);
    await request(`/api/reports/${monthlyReport.body.id_relatorio}/send`, {
      method: 'POST', body: JSON.stringify({}),
    }, 409);
    const confirmedResend = await request(`/api/reports/${monthlyReport.body.id_relatorio}/send`, {
      method: 'POST', body: JSON.stringify({ confirmResend: true }),
    });
    assert.equal(confirmedResend.body.results[0].status, 'sent');
    const deliveryHistory = await request(`/api/reports/${monthlyReport.body.id_relatorio}/deliveries`);
    assert.ok(deliveryHistory.body.itens.some((item) => deliveryIds.includes(item.id_envio)));
    console.log('WhatsApp mock: envio registrado e histórico persistido.');

    const adminCookie = cookie;
    const attendantLogin = await request('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ login: process.env.ATTENDANT_LOGIN || 'atendente', senha: process.env.ATTENDANT_PASSWORD }),
    });
    cookie = attendantLogin.response.headers.get('set-cookie')?.split(';')[0];
    await request('/api/reports/history', {}, 403);
    cookie = adminCookie;
    console.log('Acesso de atendente a relatórios bloqueado: OK');
    cookie = null;
    await request('/api/reports/history', {}, 401);
    cookie = adminCookie;
    console.log('Relatórios sem sessão: bloqueados.');

    await request(`/api/orcamentos/${quoteId}`, { method: 'DELETE' }, 200);
    quoteId = null;
    await request(`/api/clientes/${clientId}`, { method: 'DELETE' }, 200);
    clientId = null;
    await request(`/api/reports/recipients/${recipientId}`, { method: 'DELETE' }, 200);
    recipientId = null;
    await request('/api/reports/generate', {
      method: 'POST', body: JSON.stringify({ type: 'weekly', date: reportDate }),
    }, 201);
    await request('/api/reports/generate', {
      method: 'POST', body: JSON.stringify({ type: 'monthly', date: reportDate }),
    }, 201);
    console.log(`E2E concluído; admin ${adminId}; dados TESTE_ removidos.`);
  } finally {
    await cleanup();
    await pool.end();
  }
}

run().catch((error) => { console.error('E2E FALHOU:', error.message); process.exitCode = 1; });
