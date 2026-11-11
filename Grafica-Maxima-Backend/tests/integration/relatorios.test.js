const { iniciar, criarSessoes, motivoParaPular } = require('../helpers/integracao');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { getPeriod, todayAtTimezone } = require('../../src/services/reporting/period');

describe('API — relatórios e envio por WhatsApp (mock)', { skip: motivoParaPular() }, () => {
  let ctx;
  let s;
  let semanal;
  let mensal;
  let destinatarioA;
  const hoje = todayAtTimezone('America/Sao_Paulo');
  const fone = (n) => `+556199999000${n}`;

  const gerar = (body, cookie = s.admin) => ctx.req('/api/reports/generate', { method: 'POST', cookie, body });
  const enviar = (id, body = {}) => ctx.req(`/api/reports/${id}/send`, { method: 'POST', cookie: s.admin, body });
  const cadastrar = (body) => ctx.req('/api/reports/recipients', { method: 'POST', cookie: s.admin, body });

  before(async () => {
    ctx = await iniciar({ MAX_RECIPIENTS_ACTIVE: '2', MAX_RECIPIENTS_TOTAL: '3', REPORT_TIMEZONE: 'America/Sao_Paulo' });
    s = await criarSessoes(ctx);
    const material = (await ctx.req('/api/materiais', { method: 'POST', cookie: s.admin, body: { categoria: 'Offset', nome: 'Offset 90g', custo_unitario: 5, lucro_unitario: 5 } })).body.id_material;
    const criar = async (quantidade, status) => {
      const { body } = await ctx.req('/api/orcamentos', { method: 'POST', cookie: s.atendente, body: { itens: [{ id_material: material, tipo_produto: 'x', quantidade, valor_unitario: 10 }] } });
      if (status) await ctx.req(`/api/orcamentos/status-orcamento/${body.id}`, { method: 'PUT', cookie: s.atendente, body: { status, versao: 1 } });
    };
    await criar(10, 'Finalizado'); // venda de R$ 100
    await criar(5, 'Aprovado'); // R$ 50 em produção
    await criar(3, null); // R$ 30 ainda não aprovado
  });
  after(() => ctx?.encerrar());

  it('é uma área exclusiva de administradores', async () => {
    assert.equal((await ctx.req('/api/reports/history', { cookie: s.atendente })).status, 403);
    assert.equal((await gerar({ type: 'weekly' }, s.atendente)).status, 403);
    assert.equal((await ctx.req('/api/reports/recipients', { cookie: s.atendente })).status, 403);
  });

  it('valida tipo, data e identificador', async () => {
    assert.equal((await gerar({ type: 'daily' })).status, 422);
    assert.equal((await gerar({ type: 'weekly', date: '2026-02-30' })).status, 422);
    assert.equal((await ctx.req('/api/reports', { cookie: s.admin })).status, 422);
    assert.equal((await ctx.req('/api/reports?type=weekly&date=ontem', { cookie: s.admin })).status, 422);
    assert.equal((await ctx.req('/api/reports/999999', { cookie: s.admin })).status, 404);
    assert.equal((await ctx.req('/api/reports/abc', { cookie: s.admin })).status, 422);
    assert.equal((await ctx.req('/api/reports/history?limit=0', { cookie: s.admin })).status, 422);
    assert.equal((await ctx.req('/api/reports/history?type=anual', { cookie: s.admin })).status, 422);
  });

  it('gera o relatório semanal com as métricas do período', async () => {
    const res = await gerar({ type: 'weekly' });
    assert.equal(res.status, 201);
    semanal = res.body;
    const periodo = getPeriod('weekly', hoje, 'America/Sao_Paulo');
    assert.equal(semanal.tipo, 'weekly');
    assert.equal(String(semanal.data_inicio).slice(0, 10), periodo.start);
    assert.equal(String(semanal.data_fim).slice(0, 10), periodo.end);
    assert.equal(semanal.gerado_por, s.idAdmin);
    assert.equal(semanal.dados.timezone, 'America/Sao_Paulo');
    assert.deepEqual(semanal.dados.metrics, {
      quotesCreated: 3,
      conversionRate: 66.7,
      finalizedSales: 1,
      revenue: 100,
      approvedProduction: { count: 1, value: 50 },
      averageTicket: 100,
      topProducts: [{ product: 'Offset 90g', quantity: 10, value: 100 }],
    });
  });

  it('compara com o período anterior e redige o resumo', () => {
    assert.equal(semanal.dados.previous.quotesCreated, 0);
    assert.equal(semanal.dados.previous.revenue, 0);
    assert.deepEqual(semanal.dados.changes.revenue, { difference: 100, percent: null });
    assert.deepEqual(semanal.dados.changes.quotesCreated, { difference: 3, percent: null });
    assert.deepEqual(semanal.dados.changes.conversionRate, { percentagePoints: 66.7 });
    assert.match(semanal.resumo, /^Semana de \d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}: 3 orçamento\(s\) criado\(s\), 1 venda\(s\) finalizada\(s\)/);
    assert.match(semanal.resumo, /sem base no período anterior/);
    assert.match(semanal.resumo, /Conversão de 66,7%; 1 aprovado\(s\)\/em produção\./);
  });

  it('consultar ou gerar de novo reaproveita o mesmo registro', async () => {
    const consulta = await ctx.req('/api/reports?type=weekly', { cookie: s.admin });
    assert.equal(consulta.status, 200);
    assert.equal(consulta.body.id_relatorio, semanal.id_relatorio);
    const deNovo = await gerar({ type: 'weekly', date: hoje });
    assert.equal(deNovo.status, 201);
    assert.equal(deNovo.body.id_relatorio, semanal.id_relatorio);
    const porId = await ctx.req(`/api/reports/${semanal.id_relatorio}`, { cookie: s.admin });
    assert.equal(porId.body.resumo, semanal.resumo);
    const { rows } = await ctx.db.query('SELECT count(*)::int AS total FROM relatorio');
    assert.equal(rows[0].total, 1);
  });

  it('mantém histórico por tipo', async () => {
    const res = await gerar({ type: 'monthly', date: hoje });
    assert.equal(res.status, 201);
    mensal = res.body;
    assert.notEqual(mensal.id_relatorio, semanal.id_relatorio);
    assert.match(mensal.resumo, /^Mês de /);
    const historico = await ctx.req('/api/reports/history', { cookie: s.admin });
    assert.equal(historico.body.itens.length, 2);
    const soMensal = await ctx.req('/api/reports/history?type=monthly', { cookie: s.admin });
    assert.deepEqual(soMensal.body.itens.map((r) => r.id_relatorio), [mensal.id_relatorio]);
  });

  it('não envia sem destinatário cadastrado', async () => {
    const lista = await ctx.req('/api/reports/recipients', { cookie: s.admin });
    assert.deepEqual(lista.body, { mode: 'mock', itens: [], limites: { totalCount: 0, activeCount: 0, activeMax: 2, totalMax: 3 } });
    const res = await enviar(semanal.id_relatorio);
    assert.equal(res.status, 422);
    assert.match(res.body.error, /ao menos um destinatário/);
  });

  it('cadastra destinatários em E.164 até o limite de ativos', async () => {
    assert.equal((await cadastrar({ nome: 'Dona', telefone: '61999990001' })).status, 422);
    assert.equal((await cadastrar({ nome: 'Dona', telefone: '+0561999990001' })).status, 422);
    assert.equal((await cadastrar({ telefone: fone(1) })).status, 422);

    const a = await cadastrar({ nome: 'Dona da gráfica', telefone: fone(1) });
    assert.equal(a.status, 201);
    destinatarioA = a.body.id_destinatario;
    assert.equal(a.body.ativo, true);
    assert.equal(a.body.origem, 'aplicacao');
    assert.equal((await cadastrar({ nome: 'Repetido', telefone: fone(1) })).status, 409);
    assert.equal((await cadastrar({ nome: 'Gerente', telefone: fone(2) })).status, 201);

    const excedente = await cadastrar({ nome: 'Terceiro', telefone: fone(3) });
    assert.equal(excedente.status, 422);
    assert.match(excedente.body.error, /Limite de 2 destinatários ativos/);
  });

  it('envia uma vez para cada destinatário e registra a entrega', async () => {
    const res = await enviar(semanal.id_relatorio);
    assert.equal(res.status, 200);
    assert.equal(res.body.mode, 'mock');
    assert.equal(res.body.results.length, 2);
    for (const entrega of res.body.results) {
      assert.equal(entrega.status, 'sent');
      assert.equal(entrega.modo, 'mock');
      assert.equal(entrega.tentativas, 1);
      assert.match(entrega.id_mensagem, /^mock-\d+$/);
      assert.ok(entrega.enviado_em);
    }
    assert.deepEqual(res.body.results.map((e) => e.destinatario).sort(), [fone(1), fone(2)]);
  });

  it('reenvio exige confirmação explícita e não duplica registros', async () => {
    const semConfirmar = await enviar(semanal.id_relatorio);
    assert.equal(semConfirmar.status, 409);
    assert.equal(semConfirmar.body.confirmationRequired, true);
    assert.equal(semConfirmar.body.destinatarios.length, 2);

    const confirmado = await enviar(semanal.id_relatorio, { confirmResend: true });
    assert.equal(confirmado.status, 200);
    assert.equal(confirmado.body.results.length, 2);

    const entregas = await ctx.req(`/api/reports/${semanal.id_relatorio}/deliveries`, { cookie: s.admin });
    assert.equal(entregas.status, 200);
    assert.equal(entregas.body.itens.length, 2);
    assert.equal((await ctx.req('/api/reports/999999/deliveries', { cookie: s.admin })).status, 404);
    assert.equal((await enviar(999999)).status, 404);
  });

  it('os logs do envio trazem só o telefone mascarado', () => {
    const logs = ctx.logs.join('');
    assert.ok(logs.includes('"event":"whatsapp_mock_send"'));
    assert.ok(logs.includes('+55 61 *****-0001'));
    assert.ok(!logs.includes(fone(1)) && !logs.includes(fone(2)));
    assert.ok(!logs.includes('Dona da gráfica'));
  });

  it('desativa destinatário e ele sai da lista e dos próximos envios', async () => {
    const remover = await ctx.req(`/api/reports/recipients/${destinatarioA}`, { method: 'DELETE', cookie: s.admin });
    assert.equal(remover.status, 200);
    assert.equal((await ctx.req(`/api/reports/recipients/${destinatarioA}`, { method: 'DELETE', cookie: s.admin })).status, 404);
    const lista = await ctx.req('/api/reports/recipients', { cookie: s.admin });
    assert.deepEqual(lista.body.itens.map((d) => d.telefone), [fone(2)]);
    assert.deepEqual(lista.body.limites, { totalCount: 2, activeCount: 1, activeMax: 2, totalMax: 3 });
    const envio = await enviar(mensal.id_relatorio);
    assert.deepEqual(envio.body.results.map((e) => e.destinatario), [fone(2)]);
  });

  // Comportamento atual, registrado de propósito: destinatários desativados
  // continuam ocupando o número e a cota total, e a API não tem rota para
  // reativar nem para apagar de vez. Ver RELATORIO_SISTEMA.md.
  it('número desativado não pode ser recadastrado e ainda conta no limite total (comportamento atual)', async () => {
    const recadastro = await cadastrar({ nome: 'Dona da gráfica', telefone: fone(1) });
    assert.equal(recadastro.status, 409);

    const terceiro = await cadastrar({ nome: 'Terceiro', telefone: fone(3) });
    assert.equal(terceiro.status, 201);
    await ctx.req(`/api/reports/recipients/${terceiro.body.id_destinatario}`, { method: 'DELETE', cookie: s.admin });

    const quarto = await cadastrar({ nome: 'Quarto', telefone: fone(4) });
    assert.equal(quarto.status, 422);
    assert.match(quarto.body.error, /Limite de 3 destinatários cadastrados/);
    const lista = await ctx.req('/api/reports/recipients', { cookie: s.admin });
    assert.equal(lista.body.limites.activeCount, 1, 'só um ativo, mas sem espaço para novos');
  });
});
