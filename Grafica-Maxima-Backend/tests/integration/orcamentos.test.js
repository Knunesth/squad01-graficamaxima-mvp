const { iniciar, criarSessoes, motivoParaPular } = require('../helpers/integracao');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

describe('API — orçamentos', { skip: motivoParaPular() }, () => {
  let ctx;
  let s;
  let idCliente;
  let matA;
  let matB;
  let matInativo;
  let orc; // orçamento principal, acompanhado ao longo do arquivo
  let outro; // segundo orçamento, sem cliente

  const post = (body, cookie = s.atendente) => ctx.req('/api/orcamentos', { method: 'POST', cookie, body });
  const put = (id, body, cookie = s.atendente) => ctx.req(`/api/orcamentos/${id}`, { method: 'PUT', cookie, body });
  const get = (id, cookie = s.atendente) => ctx.req(`/api/orcamentos/${id}`, { cookie });
  const mudarStatus = (id, body, cookie = s.atendente) => ctx.req(`/api/orcamentos/status-orcamento/${id}`, { method: 'PUT', cookie, body });
  const itemA = (extra = {}) => ({ id_material: matA, tipo_produto: 'nome enviado pelo cliente', quantidade: 100, valor_unitario: 0.3, ...extra });

  before(async () => {
    ctx = await iniciar();
    s = await criarSessoes(ctx);
    const cliente = await ctx.req('/api/clientes', { method: 'POST', cookie: s.atendente, body: { nome: 'Studio Ipê', telefone: '61 99911-1001', email: 'contato@studioipe.example', cpf_cnpj: '11111111111' } });
    idCliente = cliente.body.id_cliente;
    const criarMaterial = async (body) => (await ctx.req('/api/materiais', { method: 'POST', cookie: s.admin, body })).body.id_material;
    matA = await criarMaterial({ categoria: 'Offset', nome: 'Offset 90g A4', custo_unitario: 0.18, lucro_unitario: 0.12 });
    matB = await criarMaterial({ categoria: 'Laminação', nome: 'Laminação fosca', custo_unitario: 0.45, lucro_unitario: 0.2 });
    matInativo = await criarMaterial({ categoria: 'Kraft', nome: 'Kraft 80g' });
    await ctx.req(`/api/materiais/${matInativo}`, { method: 'DELETE', cookie: s.admin });
  });
  after(() => ctx?.encerrar());

  describe('criação', () => {
    it('calcula os totais no servidor e nasce como "Não aprovado"', async () => {
      const res = await post({
        id_cliente: idCliente,
        itens: [itemA()],
        desconto_tipo: 'percentual',
        desconto_valor: 10,
        data_validade: '2026-12-31',
        prazo_entrega: '2026-12-15',
        observacoes: '  Entregar pela manhã.  ',
        valor_total: 1, // ignorado: o total é sempre recalculado
        status: 'Aprovado', // ignorado
      });
      assert.equal(res.status, 201);
      assert.deepEqual(res.body, { id: res.body.id, id_orcamento: res.body.id, valor_total: 27, versao: 1 });

      orc = (await get(res.body.id)).body;
      assert.equal(orc.status, 'Não aprovado');
      assert.equal(orc.subtotal, '30.0000');
      assert.equal(orc.valor_total, '27.0000');
      assert.equal(orc.desconto_tipo, 'percentual');
      assert.equal(orc.desconto_valor, '10.0000');
      assert.equal(orc.quantidade, 100);
      assert.equal(orc.versao, 1);
      assert.equal(orc.observacoes, 'Entregar pela manhã.');
      assert.equal(orc.nome_cliente, 'Studio Ipê');
      assert.equal(orc.id_usuario, s.idAtendente);
      assert.equal(orc.data_finalizacao, null);
    });

    it('usa o nome do catálogo e guarda um retrato do preço do material', () => {
      assert.equal(orc.itens.length, 1);
      const item = orc.itens[0];
      assert.equal(item.tipo_produto, 'Offset 90g A4');
      assert.equal(item.id_material, matA);
      assert.equal(item.quantidade, 100);
      assert.equal(item.valor_unitario, '0.3000');
      assert.equal(item.valor_total, '30.0000');
      const retrato = JSON.parse(item.precificacao_snapshot);
      assert.equal(retrato.nome, 'Offset 90g A4');
      assert.equal(retrato.custo_unitario, '0.1800');
      assert.equal(retrato.lucro_unitario, '0.1200');
    });

    it('permite orçamento sem cliente', async () => {
      const res = await post({ itens: [itemA({ quantidade: 10 }), { id_material: matB, tipo_produto: 'x', quantidade: 10, valor_unitario: 0.65 }], desconto_tipo: 'valor', desconto_valor: 1.5 });
      assert.equal(res.status, 201);
      assert.equal(res.body.valor_total, 8);
      outro = (await get(res.body.id)).body;
      assert.equal(outro.id_cliente, null);
      assert.equal(outro.nome_cliente, null);
      assert.equal(outro.itens.length, 2);
      assert.equal(outro.quantidade, 20);
    });

    it('rejeita cliente inexistente, material inativo ou ausente e lista vazia', async () => {
      const casos = [
        [{ id_cliente: 999999, itens: [itemA()] }, /Cliente não encontrado/],
        [{ itens: [itemA({ id_material: matInativo })] }, /Material indisponível/],
        [{ itens: [itemA({ id_material: 999999 })] }, /Material indisponível/],
        [{ itens: [itemA({ id_material: null })] }, /material do catálogo/],
        [{ itens: [] }, /1 a 17/],
        [{ itens: [itemA({ quantidade: 0 })] }, /Quantidade/],
        [{ itens: [itemA()], data_validade: '31/12/2026' }, /Data inválida/],
        [{ itens: [itemA()], desconto_valor: 101 }, /Desconto/],
        [{ itens: [itemA()], observacoes: 'x'.repeat(5001) }, /Observações/],
      ];
      for (const [body, mensagem] of casos) {
        const res = await post(body);
        assert.equal(res.status, 422, JSON.stringify(body).slice(0, 80));
        assert.match(res.body.error, mensagem);
      }
      const { rows } = await ctx.db.query('SELECT count(*)::int AS total FROM orcamento');
      assert.equal(rows[0].total, 2, 'tentativas inválidas não deixam orçamento pela metade');
    });

    // Comportamento atual, registrado de propósito: o valor unitário vem do
    // cliente HTTP e não é comparado com custo + lucro do material.
    it('aceita valor unitário abaixo do custo do material (comportamento atual)', async () => {
      const res = await post({ itens: [itemA({ quantidade: 1, valor_unitario: 0.01 })] });
      assert.equal(res.status, 201);
      assert.equal(res.body.valor_total, 0.01);
      await ctx.req(`/api/orcamentos/${res.body.id}`, { method: 'DELETE', cookie: s.admin });
    });
  });

  describe('consulta e listagem', () => {
    it('pagina do mais recente para o mais antigo', async () => {
      const todos = await ctx.req('/api/orcamentos', { cookie: s.atendente });
      assert.equal(todos.status, 200);
      assert.equal(todos.body.total, 2);
      assert.equal(todos.body.page, 1);
      assert.equal(todos.body.limit, 20);
      assert.deepEqual(todos.body.itens.map((o) => o.id_orcamento), [outro.id_orcamento, orc.id_orcamento]);

      const pagina2 = await ctx.req('/api/orcamentos?limit=1&page=2', { cookie: s.atendente });
      assert.equal(pagina2.body.total, 2);
      assert.deepEqual(pagina2.body.itens.map((o) => o.id_orcamento), [orc.id_orcamento]);
    });

    it('busca por número do orçamento, nome ou e-mail do cliente', async () => {
      const ids = async (busca) => (await ctx.req(`/api/orcamentos?busca=${encodeURIComponent(busca)}`, { cookie: s.atendente })).body.itens.map((o) => o.id_orcamento);
      assert.deepEqual(await ids(String(outro.id_orcamento)), [outro.id_orcamento]);
      assert.deepEqual(await ids('studio'), [orc.id_orcamento]);
      assert.deepEqual(await ids('STUDIOIPE.example'), [orc.id_orcamento]);
      assert.deepEqual(await ids('nada-parecido'), []);
      assert.deepEqual(await ids("' OR 1=1 --"), [], 'busca é parametrizada');
    });

    it('filtra por status agrupando os equivalentes', async () => {
      const total = async (status) => (await ctx.req(`/api/orcamentos?status=${encodeURIComponent(status)}`, { cookie: s.atendente })).body.total;
      assert.equal(await total('Não aprovado'), 2);
      assert.equal(await total('Aprovado'), 0);
      assert.equal(await total('Inativo'), 0);
    });

    it('valida parâmetros de listagem e ids', async () => {
      for (const query of ['?status=Cancelado', '?limit=101', '?limit=0', '?page=0', '?page=abc']) {
        assert.equal((await ctx.req(`/api/orcamentos${query}`, { cookie: s.atendente })).status, 422, query);
      }
      assert.equal((await get(999999)).status, 404);
      assert.equal((await get('abc')).status, 422);
    });

    it('status-orcamento devolve os apelidos usados pela tela', async () => {
      const res = await ctx.req(`/api/orcamentos/status-orcamento/${orc.id_orcamento}`, { cookie: s.atendente });
      assert.equal(res.status, 200);
      assert.equal(res.body.id, orc.id_orcamento);
      assert.equal(res.body.nomeCliente, 'Studio Ipê');
      assert.equal(res.body.valor, '27.0000');
    });
  });

  describe('edição com controle de versão', () => {
    it('recusa versão desatualizada ou ausente e orçamento inexistente', async () => {
      const corpo = { itens: [itemA({ id_item: orc.itens[0].id_item })] };
      const conflito = await put(orc.id_orcamento, { ...corpo, versao: 99 });
      assert.equal(conflito.status, 409);
      assert.match(conflito.body.error, /alterado por outra pessoa/);
      assert.equal((await put(orc.id_orcamento, corpo)).status, 422);
      assert.equal((await put(999999, { ...corpo, versao: 1 })).status, 404);
      assert.equal((await get(orc.id_orcamento)).body.versao, 1, 'nada foi gravado');
    });

    it('recusa item de outro orçamento e item repetido', async () => {
      const deOutro = await put(orc.id_orcamento, { versao: 1, itens: [itemA({ id_item: outro.itens[0].id_item })] });
      assert.equal(deOutro.status, 422);
      assert.match(deOutro.body.error, /Item inválido/);
      const idItem = orc.itens[0].id_item;
      const repetido = await put(orc.id_orcamento, { versao: 1, itens: [itemA({ id_item: idItem }), itemA({ id_item: idItem })] });
      assert.equal(repetido.status, 422);
    });

    it('preserva o retrato de preço quando o material muda depois', async () => {
      const mudar = await ctx.req(`/api/materiais/${matA}`, { method: 'PUT', cookie: s.admin, body: { categoria: 'Offset', nome: 'Offset 90g A4 (novo)', custo_unitario: 0.5, lucro_unitario: 0.5 } });
      assert.equal(mudar.status, 200);

      const res = await put(orc.id_orcamento, {
        versao: 1,
        id_cliente: idCliente,
        desconto_tipo: 'valor',
        desconto_valor: 5,
        itens: [
          itemA({ id_item: orc.itens[0].id_item, quantidade: 200 }),
          { id_material: matB, tipo_produto: 'x', quantidade: 50, valor_unitario: 0.65 },
        ],
      });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, { id: orc.id_orcamento, id_orcamento: orc.id_orcamento, valor_total: 87.5, versao: 2 });

      orc = (await get(orc.id_orcamento)).body;
      assert.equal(orc.versao, 2);
      assert.equal(orc.subtotal, '92.5000');
      assert.equal(orc.valor_total, '87.5000');
      assert.equal(orc.quantidade, 250);
      assert.equal(orc.itens.length, 2);
      const [antigo, novo] = orc.itens;
      assert.equal(antigo.quantidade, 200);
      assert.equal(antigo.tipo_produto, 'nome enviado pelo cliente', 'item mantido não é renomeado pelo catálogo');
      assert.equal(JSON.parse(antigo.precificacao_snapshot).custo_unitario, '0.1800', 'retrato original preservado');
      assert.equal(novo.tipo_produto, 'Laminação fosca');
      assert.equal(JSON.parse(novo.precificacao_snapshot).custo_unitario, '0.4500');
    });

    it('remove os itens que não vieram na edição', async () => {
      const manter = orc.itens[1];
      const res = await put(orc.id_orcamento, { versao: 2, id_cliente: idCliente, itens: [{ id_item: manter.id_item, id_material: matB, tipo_produto: manter.tipo_produto, quantidade: 50, valor_unitario: 0.65 }] });
      assert.equal(res.status, 200);
      assert.equal(res.body.versao, 3);
      orc = (await get(orc.id_orcamento)).body;
      assert.deepEqual(orc.itens.map((i) => i.id_item), [manter.id_item]);
      assert.equal(orc.valor_total, '32.5000');
      const { rows } = await ctx.db.query('SELECT count(*)::int AS total FROM item WHERE id_orcamento = $1', [orc.id_orcamento]);
      assert.equal(rows[0].total, 1);
    });

    it('duas edições simultâneas com a mesma versão: só uma vence', async () => {
      const corpo = () => ({ versao: 3, id_cliente: idCliente, itens: [{ id_item: orc.itens[0].id_item, id_material: matB, tipo_produto: 'Laminação fosca', quantidade: 60, valor_unitario: 0.65 }] });
      const respostas = await Promise.all([put(orc.id_orcamento, corpo()), put(orc.id_orcamento, corpo(), s.admin)]);
      assert.deepEqual(respostas.map((r) => r.status).sort(), [200, 409]);
      orc = (await get(orc.id_orcamento)).body;
      assert.equal(orc.versao, 4);
    });
  });

  describe('status e PDF', () => {
    it('não gera PDF antes da aprovação', async () => {
      const res = await ctx.req(`/api/orcamentos/${orc.id_orcamento}/pdf`, { cookie: s.atendente });
      assert.equal(res.status, 409);
      assert.match(res.body.error, /Aprove o orçamento/);
    });

    it('valida status, versão e existência', async () => {
      assert.equal((await mudarStatus(orc.id_orcamento, { status: 'Cancelado', versao: 4 })).status, 422);
      assert.equal((await mudarStatus(orc.id_orcamento, { status: 'Aprovado' })).status, 422);
      assert.equal((await mudarStatus(orc.id_orcamento, { status: 'Aprovado', versao: 1 })).status, 409);
      assert.equal((await mudarStatus(999999, { status: 'Aprovado', versao: 1 })).status, 404);
    });

    it('aprova, incrementa a versão e libera o PDF', async () => {
      const res = await mudarStatus(orc.id_orcamento, { status: 'Aprovado', versao: 4 });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, { status: 'Aprovado', versao: 5 });

      const pdf = await ctx.req(`/api/orcamentos/${orc.id_orcamento}/pdf`, { cookie: s.atendente, binario: true });
      assert.equal(pdf.status, 200);
      assert.match(pdf.headers.get('content-type'), /^application\/pdf/);
      assert.equal(pdf.headers.get('content-disposition'), `attachment; filename="orcamento-${orc.id_orcamento}.pdf"`);
      assert.equal(pdf.buffer.subarray(0, 5).toString(), '%PDF-');
      assert.ok(pdf.buffer.length > 1500);
    });

    it('"Finalizado" registra a data de finalização; voltar atrás apaga', async () => {
      const finalizar = await mudarStatus(orc.id_orcamento, { status: 'Finalizado', versao: 5 });
      assert.equal(finalizar.status, 200);
      let atual = (await get(orc.id_orcamento)).body;
      assert.ok(atual.data_finalizacao, 'data_finalizacao preenchida');
      assert.ok(Math.abs(Date.now() - new Date(atual.data_finalizacao).getTime()) < 60000);
      assert.equal((await ctx.req('/api/orcamentos?status=Aprovado', { cookie: s.atendente })).body.total, 1, 'filtro "Aprovado" inclui finalizados');

      await mudarStatus(orc.id_orcamento, { status: 'Aprovado', versao: 6 });
      atual = (await get(orc.id_orcamento)).body;
      assert.equal(atual.data_finalizacao, null);
      assert.equal(atual.versao, 7);
      orc = atual;
    });

    // Comportamento atual, registrado de propósito: editar um orçamento já
    // aprovado mantém a aprovação, mesmo com valores diferentes.
    it('editar orçamento aprovado mantém o status (comportamento atual)', async () => {
      const res = await put(orc.id_orcamento, { versao: 7, id_cliente: idCliente, itens: [{ id_item: orc.itens[0].id_item, id_material: matB, tipo_produto: 'Laminação fosca', quantidade: 500, valor_unitario: 0.65 }] });
      assert.equal(res.status, 200);
      orc = (await get(orc.id_orcamento)).body;
      assert.equal(orc.status, 'Aprovado');
      assert.equal(orc.valor_total, '325.0000');
    });
  });

  describe('exclusão e auditoria', () => {
    it('somente administrador exclui', async () => {
      const res = await ctx.req(`/api/orcamentos/${orc.id_orcamento}`, { method: 'DELETE', cookie: s.atendente });
      assert.equal(res.status, 403);
      assert.equal((await get(orc.id_orcamento)).status, 200);
    });

    it('exclui o orçamento e seus itens', async () => {
      const res = await ctx.req(`/api/orcamentos/${orc.id_orcamento}`, { method: 'DELETE', cookie: s.admin });
      assert.equal(res.status, 200);
      assert.equal((await get(orc.id_orcamento)).status, 404);
      assert.equal((await ctx.req(`/api/orcamentos/${orc.id_orcamento}`, { method: 'DELETE', cookie: s.admin })).status, 404);
      const { rows } = await ctx.db.query('SELECT count(*)::int AS total FROM item WHERE id_orcamento = $1 OR id_orcamento IS NULL', [orc.id_orcamento]);
      assert.equal(rows[0].total, 0, 'nenhum item órfão');
    });

    it('registra cada operação no histórico, com autor', async () => {
      const { rows } = await ctx.db.query(
        "SELECT acao, id_usuario, valor_antigo, valor_novo FROM historico_log WHERE tabela_afetada = 'orcamento' AND id_registro = $1 ORDER BY id_log",
        [orc.id_orcamento],
      );
      assert.deepEqual(rows.map((r) => r.acao), ['criar', 'editar', 'editar', 'editar', 'status', 'status', 'status', 'editar', 'excluir']);
      assert.equal(rows[0].id_usuario, s.idAtendente);
      assert.equal(rows.at(-1).id_usuario, s.idAdmin);
      assert.deepEqual(JSON.parse(rows[4].valor_antigo), { status: 'Não aprovado' });
      assert.deepEqual(JSON.parse(rows[4].valor_novo), { status: 'Aprovado' });
      assert.equal(rows.at(-1).valor_novo, null);
    });
  });

  describe('ida e volta com a tela de edição', () => {
    // Assimetria conhecida da API: o GET devolve `prazo_entrega` como
    // data-hora ISO ("2026-12-15T03:00:00.000Z"), mas o PUT só aceita
    // YYYY-MM-DD e responde 422 "Data inválida.". A tela de edição já
    // converte o valor antes de enviar (ver tests/budgets.test.jsx no
    // frontend); outros clientes da API ainda precisam fazer o mesmo.
    it('aceita de volta as datas no formato em que o GET as devolve', async () => {
      const criado = await post({ itens: [itemA()], prazo_entrega: '2026-12-15', data_validade: '2026-12-31' });
      assert.equal(criado.status, 201);
      const lido = (await get(criado.body.id)).body;
      // Mesmo corpo que NewBudgetPage.jsx monta ao salvar uma edição.
      const res = await put(criado.body.id, {
        versao: lido.versao,
        itens: lido.itens.map((i) => ({ id_item: i.id_item, id_material: i.id_material, tipo_produto: i.tipo_produto, quantidade: i.quantidade, valor_unitario: Number(i.valor_unitario) })),
        data_validade: lido.data_validade,
        prazo_entrega: lido.prazo_entrega,
        observacoes: lido.observacoes || '',
      });
      assert.equal(res.status, 200, res.body?.error);
    });
  });
});
