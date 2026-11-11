const { iniciar, criarSessoes, motivoParaPular, urlBruta } = require('../helpers/integracao');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Pool } = require('pg');

describe('API — calculadora de m² e dashboard', { skip: motivoParaPular() }, () => {
  let ctx;
  let s;
  let material;
  let idOrcamento;

  const calcular = (rota, body, cookie = s.atendente) => ctx.req(`/api/calculo/${rota}`, { method: 'POST', cookie, body });
  const medidas = { tipo_servico: 'banner', largura: 2, altura: 1.5, quantidade: 2 };

  before(async () => {
    ctx = await iniciar();
    s = await criarSessoes(ctx);
    await ctx.db.query("INSERT INTO preco_m2 (tipo, preco_base_m2) VALUES ('banner', 48), ('adesivo', 36)");
    material = (await ctx.req('/api/materiais', { method: 'POST', cookie: s.admin, body: { categoria: 'Offset', nome: 'Offset 90g', custo_unitario: 0.18, lucro_unitario: 0.12 } })).body.id_material;
    const criado = await ctx.req('/api/orcamentos', { method: 'POST', cookie: s.atendente, body: { itens: [{ id_material: material, tipo_produto: 'x', quantidade: 100, valor_unitario: 1 }], desconto_tipo: 'percentual', desconto_valor: 10 } });
    idOrcamento = criado.body.id;
  });
  after(() => ctx?.encerrar());

  it('lista os tipos de serviço em ordem alfabética', async () => {
    const res = await ctx.req('/api/calculo/tipos', { cookie: s.atendente });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { tipos: [{ tipo: 'adesivo', preco_base_m2: '36.0000' }, { tipo: 'banner', preco_base_m2: '48.0000' }] });
  });

  it('simula usando o preço cadastrado, sem gravar nada', async () => {
    const res = await calcular('metro-quadrado/simulacao', medidas);
    assert.equal(res.status, 200);
    assert.equal(res.body.calculo.preco_por_m2, 48);
    assert.equal(res.body.calculo.area_total_m2, 6);
    assert.equal(res.body.calculo.valor_total, 288);
    const { rows } = await ctx.db.query('SELECT count(*)::int AS total FROM item');
    assert.equal(rows[0].total, 1);
  });

  it('simulação recusa vínculo com orçamento e dados inválidos', async () => {
    const comVinculo = await calcular('metro-quadrado/simulacao', { ...medidas, id_orcamento: idOrcamento });
    assert.equal(comVinculo.status, 422);
    assert.match(comVinculo.body.error, /Simulação não vincula/);
    const invalido = await calcular('metro-quadrado/simulacao', { ...medidas, tipo_servico: 'lona' });
    assert.equal(invalido.status, 422);
    assert.deepEqual(invalido.body.detalhes, [{ campo: 'tipo_servico', mensagem: 'Tipo de serviço inválido.' }]);
    assert.equal((await calcular('metro-quadrado/simulacao', { ...medidas, largura: 0 })).status, 422);
  });

  it('vincula o cálculo ao orçamento e recalcula os totais com o desconto', async () => {
    const res = await calcular('metro-quadrado', { ...medidas, id_orcamento: idOrcamento });
    assert.equal(res.status, 200);
    const orcamento = (await ctx.req(`/api/orcamentos/${idOrcamento}`, { cookie: s.atendente })).body;
    assert.equal(orcamento.itens.length, 2);
    const novo = orcamento.itens[1];
    assert.equal(novo.tipo_produto, 'banner');
    assert.equal(novo.quantidade, 2);
    assert.equal(novo.largura, '2.00');
    assert.equal(novo.altura, '1.50');
    assert.equal(novo.valor_total, '288.0000');
    assert.equal(orcamento.subtotal, '388.0000');
    assert.equal(orcamento.valor_total, '349.2000', '10% de desconto sobre o novo subtotal');
    assert.equal(orcamento.quantidade, 102);
    assert.equal(orcamento.versao, 2);
    const { rows } = await ctx.db.query("SELECT count(*)::int AS total FROM historico_log WHERE acao = 'adicionar_m2' AND id_registro = $1", [idOrcamento]);
    assert.equal(rows[0].total, 1);
  });

  it('recusa orçamento inexistente e respeita o limite de 17 itens', async () => {
    assert.equal((await calcular('metro-quadrado', { ...medidas, id_orcamento: 999999 })).status, 404);
    const cheio = await ctx.req('/api/orcamentos', { method: 'POST', cookie: s.atendente, body: { itens: Array.from({ length: 17 }, () => ({ id_material: material, tipo_produto: 'x', quantidade: 1, valor_unitario: 1 })) } });
    assert.equal(cheio.status, 201);
    const res = await calcular('metro-quadrado', { ...medidas, id_orcamento: cheio.body.id });
    assert.equal(res.status, 422);
    assert.match(res.body.error, /17 itens/);
    await ctx.req(`/api/orcamentos/${cheio.body.id}`, { method: 'DELETE', cookie: s.admin });
  });

  it('só administrador altera o preço por m²', async () => {
    const atualizar = (body, cookie) => ctx.req('/api/calculo/tipos/atualizar', { method: 'PUT', cookie, body });
    assert.equal((await atualizar({ tipo: 'banner', preco_base_m2: 50 }, s.atendente)).status, 403);
    assert.equal((await atualizar({ tipo: 'lona', preco_base_m2: 50 }, s.admin)).status, 404);
    assert.equal((await atualizar({ tipo: 'banner', preco_base_m2: 0 }, s.admin)).status, 422);
    assert.equal((await atualizar({ tipo: 'banner', preco_base_m2: 50 }, s.admin)).status, 200);
    const simulacao = await calcular('metro-quadrado/simulacao', medidas);
    assert.equal(simulacao.body.calculo.valor_total, 300);
  });

  it('dashboard resume o funil ativo e a movimentação do mês', async () => {
    const aprovado = await ctx.req('/api/orcamentos', { method: 'POST', cookie: s.atendente, body: { itens: [{ id_material: material, tipo_produto: 'x', quantidade: 10, valor_unitario: 5 }] } });
    await ctx.req(`/api/orcamentos/status-orcamento/${aprovado.body.id}`, { method: 'PUT', cookie: s.atendente, body: { status: 'Aprovado', versao: 1 } });
    const inativo = await ctx.req('/api/orcamentos', { method: 'POST', cookie: s.atendente, body: { itens: [{ id_material: material, tipo_produto: 'x', quantidade: 10, valor_unitario: 7 }] } });
    await ctx.req(`/api/orcamentos/status-orcamento/${inativo.body.id}`, { method: 'PUT', cookie: s.atendente, body: { status: 'Inativo', versao: 1 } });

    const res = await ctx.req('/api/dashboard', { cookie: s.atendente });
    assert.equal(res.status, 200);
    const d = res.body;
    assert.match(d.mes, /^\d{4}-\d{2}$/);
    assert.equal(d.ativos, 2, 'inativos e finalizados ficam fora do funil');
    assert.equal(d.valorAtivo, 349.2 + 50);
    assert.equal(d.semanas.length, 5);
    assert.equal(d.semanas.reduce((soma, semana) => soma + semana.novos, 0), d.novos);
    assert.equal(d.semanas.reduce((soma, semana) => soma + semana.aprovados, 0), d.aprovados);
    // Totais em reais do período: tudo que foi criado e a parte aprovada.
    assert.equal(d.novos, 3);
    assert.equal(d.valorNovos, 349.2 + 50 + 70);
    assert.equal(d.aprovados, 1);
    assert.equal(d.valorAprovados, 50);
    assert.equal(d.semanas.reduce((soma, semana) => soma + semana.valor, 0), d.valorNovos);
    assert.equal(d.statusCounts['Não aprovado'].count, 1);
    assert.equal(d.statusCounts.Aprovado.valor, 50);
    assert.ok(d.recentes.length <= 4);
    assert.equal(d.recentes[0].id_orcamento, inativo.body.id);
  });

  it('dashboard de outro mês zera o período mas mantém o funil ativo', async () => {
    const res = await ctx.req('/api/dashboard?mes=2020-01', { cookie: s.atendente });
    assert.equal(res.status, 200);
    assert.equal(res.body.novos, 0);
    assert.equal(res.body.aprovados, 0);
    assert.equal(res.body.valorNovos, 0);
    assert.equal(res.body.valorAprovados, 0);
    assert.deepEqual(res.body.orcamentosPeriodo, []);
    assert.equal(res.body.ativos, 2);
  });

  it('dashboard valida o parâmetro mes', async () => {
    for (const mes of ['2026-13', '2026-1', 'novembro', '2026-11-01']) {
      assert.equal((await ctx.req(`/api/dashboard?mes=${mes}`, { cookie: s.atendente })).status, 422, mes);
    }
  });
});

describe('scripts/migrate.js', { skip: motivoParaPular() }, () => {
  const schema = `teste_migracao_${crypto.randomBytes(4).toString('hex')}`;
  let pool;

  function migrar() {
    const url = new URL(urlBruta);
    url.searchParams.set('options', `-csearch_path=${schema}`);
    return spawnSync(process.execPath, ['scripts/migrate.js'], {
      cwd: path.join(__dirname, '..', '..'),
      env: { ...process.env, DATABASE_URL: url.toString(), DATABASE_SSL: 'disable' },
      encoding: 'utf8',
    });
  }

  before(async () => {
    pool = new Pool({ connectionString: urlBruta, max: 1 });
    await pool.query(`CREATE SCHEMA "${schema}"`);
  });
  after(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
  });

  it('aplica todas as migrations em ordem, a partir de um schema vazio', async () => {
    const resultado = migrar();
    assert.equal(resultado.status, 0, resultado.stderr);
    const aplicadas = [...resultado.stdout.matchAll(/Migração aplicada: (\S+)/g)].map((m) => m[1]);
    assert.equal(aplicadas.length, 8);
    assert.deepEqual(aplicadas, [...aplicadas].sort());
    const { rows } = await pool.query(`SELECT count(*)::int AS total FROM "${schema}".schema_migrations`);
    assert.equal(rows[0].total, 8);
    const tabelas = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', [schema]);
    const nomes = tabelas.rows.map((r) => r.table_name);
    for (const tabela of ['usuario', 'cliente', 'orcamento', 'item', 'material', 'preco_m2', 'historico_log', 'relatorio', 'relatorio_envio', 'whatsapp_destinatario']) {
      assert.ok(nomes.includes(tabela), `tabela ${tabela}`);
    }
    const coluna = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'usuario' AND column_name = 'token_version'", [schema]);
    assert.equal(coluna.rowCount, 1);
  });

  it('é idempotente: rodar de novo não aplica nada', async () => {
    const resultado = migrar();
    assert.equal(resultado.status, 0, resultado.stderr);
    assert.ok(!resultado.stdout.includes('Migração aplicada'));
  });
});
