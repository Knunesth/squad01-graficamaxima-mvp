const { iniciar, criarSessoes, motivoParaPular } = require('../helpers/integracao');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

let ctx;
let s;

describe('API — cadastros', { skip: motivoParaPular() }, () => {
before(async () => {
  ctx = await iniciar();
  s = await criarSessoes(ctx);
});
after(() => ctx?.encerrar());

describe('clientes', () => {
  let idCliente;
  const valido = { nome: ' Studio Ipê ', telefone: '(61) 99911-1001', email: 'Contato@StudioIpe.example', cpf_cnpj: '111.111.111-11' };
  const criar = (body, cookie = s.atendente) => ctx.req('/api/clientes', { method: 'POST', cookie, body });

  it('cadastra normalizando nome, e-mail e documento', async () => {
    const res = await criar(valido);
    assert.equal(res.status, 201);
    idCliente = res.body.id_cliente;
    assert.deepEqual(res.body, { id_cliente: idCliente, nome: 'Studio Ipê', telefone: '(61) 99911-1001', email: 'contato@studioipe.example', cpf_cnpj: '11111111111' });
  });

  it('rejeita dados inválidos com 422', async () => {
    const casos = [
      [{ ...valido, nome: '' }, /Nome/],
      [{ ...valido, email: 'sem-arroba' }, /E-mail inválido/],
      [{ ...valido, cpf_cnpj: '123.456.789-0' }, /11 ou 14 dígitos/],
      [{ ...valido, cpf_cnpj: '1234567890123' }, /11 ou 14 dígitos/],
      [{ ...valido, telefone: '9911-1001' }, /Telefone inválido/],
      [{ ...valido, nome: 'x'.repeat(101) }, /Nome/],
      [{}, /Nome/],
    ];
    for (const [body, mensagem] of casos) {
      const res = await criar(body);
      assert.equal(res.status, 422, JSON.stringify(body));
      assert.match(res.body.error, mensagem);
    }
  });

  it('recusa documento repetido mesmo com outra formatação', async () => {
    const res = await criar({ ...valido, nome: 'Outro nome', email: 'outro@exemplo.example', cpf_cnpj: '11111111111' });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /já cadastrado/);
  });

  it('aceita CNPJ com 14 dígitos', async () => {
    const res = await criar({ nome: 'Café Central', telefone: '61 3333-4444', email: 'compras@cafecentral.example', cpf_cnpj: '12.345.678/0001-90' });
    assert.equal(res.status, 201);
    assert.equal(res.body.cpf_cnpj, '12345678000190');
  });

  it('cadastros simultâneos do mesmo documento criam um único cliente', async () => {
    const corpo = { nome: 'Corrida', telefone: '61 99999-0000', email: 'corrida@exemplo.example', cpf_cnpj: '222.222.222-22' };
    const respostas = await Promise.all(Array.from({ length: 6 }, () => criar(corpo)));
    const status = respostas.map((r) => r.status).sort();
    assert.deepEqual(status, [201, 409, 409, 409, 409, 409]);
    const { rows } = await ctx.db.query("SELECT count(*)::int AS total FROM cliente WHERE cpf_cnpj = '22222222222'");
    assert.equal(rows[0].total, 1);
  });

  it('lista e consulta por id', async () => {
    const lista = await ctx.req('/api/clientes', { cookie: s.atendente });
    assert.equal(lista.status, 200);
    assert.equal(lista.body.length, 3);
    assert.deepEqual(Object.keys(lista.body[0]).sort(), ['cpf_cnpj', 'data_cadastro', 'email', 'id_cliente', 'nome', 'telefone']);
    assert.ok(lista.body[0].id_cliente > lista.body[1].id_cliente, 'mais recentes primeiro');

    const um = await ctx.req(`/api/clientes/${idCliente}`, { cookie: s.atendente });
    assert.equal(um.body.nome, 'Studio Ipê');
    assert.equal((await ctx.req('/api/clientes/999999', { cookie: s.atendente })).status, 404);
    assert.equal((await ctx.req('/api/clientes/abc', { cookie: s.atendente })).status, 422);
  });

  it('busca cliente pelo par e-mail + documento', async () => {
    const buscar = (body) => ctx.req('/api/clientes/buscar', { method: 'POST', cookie: s.atendente, body });
    const achou = await buscar({ email: 'CONTATO@studioipe.example', cpf_cnpj: '111.111.111-11' });
    assert.equal(achou.status, 200);
    assert.equal(achou.body.id_cliente, idCliente);
    assert.equal((await buscar({ email: 'outro@exemplo.example', cpf_cnpj: '111.111.111-11' })).status, 404);
    assert.equal((await buscar({ email: 'contato@studioipe.example', cpf_cnpj: '123' })).status, 422);
    assert.equal((await buscar({ email: 'contato@studioipe.example' })).status, 422);
  });

  it('atualiza e impede assumir o documento de outro cliente', async () => {
    const editar = (id, body) => ctx.req(`/api/clientes/${id}`, { method: 'PUT', cookie: s.atendente, body });
    const ok = await editar(idCliente, { ...valido, nome: 'Studio Ipê Ltda', telefone: '61 99911-2002' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.nome, 'Studio Ipê Ltda');
    assert.equal((await editar(idCliente, { ...valido, cpf_cnpj: '12345678000190' })).status, 409);
    assert.equal((await editar(999999, { ...valido, cpf_cnpj: '333.333.333-33' })).status, 404);
    assert.equal((await editar(idCliente, { ...valido, email: 'x' })).status, 422);
  });

  it('não exclui cliente com orçamento e exclui quando está livre', async () => {
    await ctx.db.query('INSERT INTO orcamento (id_cliente, id_usuario) VALUES ($1, $2)', [idCliente, s.idAtendente]);
    const comOrcamento = await ctx.req(`/api/clientes/${idCliente}`, { method: 'DELETE', cookie: s.atendente });
    assert.equal(comOrcamento.status, 409);
    assert.match(comOrcamento.body.error, /possui orçamentos/);

    await ctx.db.query('DELETE FROM orcamento WHERE id_cliente = $1', [idCliente]);
    assert.equal((await ctx.req(`/api/clientes/${idCliente}`, { method: 'DELETE', cookie: s.atendente })).status, 200);
    assert.equal((await ctx.req(`/api/clientes/${idCliente}`, { method: 'DELETE', cookie: s.atendente })).status, 404);
  });
});

describe('catálogo de materiais', () => {
  let idMaterial;
  const material = { categoria: 'Offset', nome: 'Offset 90g A4', custo_fixo: 0, custo_unitario: 0.18, lucro_fixo: 0, lucro_unitario: 0.12 };

  it('lista as categorias fixas mesmo com catálogo vazio', async () => {
    const res = await ctx.req('/api/materiais', { cookie: s.atendente });
    assert.equal(res.status, 200);
    assert.equal(res.body.categorias.length, 16);
    assert.ok(res.body.categorias.includes('Couchê 64'));
    assert.deepEqual(res.body.itens, []);
  });

  it('só administrador cria, edita e remove materiais', async () => {
    assert.equal((await ctx.req('/api/materiais', { method: 'POST', cookie: s.atendente, body: material })).status, 403);
    assert.equal((await ctx.req('/api/materiais/1', { method: 'PUT', cookie: s.atendente, body: material })).status, 403);
    assert.equal((await ctx.req('/api/materiais/1', { method: 'DELETE', cookie: s.atendente })).status, 403);
  });

  it('cria material e devolve valores com 4 casas', async () => {
    const res = await ctx.req('/api/materiais', { method: 'POST', cookie: s.admin, body: material });
    assert.equal(res.status, 201);
    idMaterial = res.body.id_material;
    const lista = await ctx.req('/api/materiais', { cookie: s.atendente });
    assert.equal(lista.body.itens.length, 1);
    assert.equal(lista.body.itens[0].nome, 'Offset 90g A4');
    assert.equal(lista.body.itens[0].custo_unitario, '0.1800');
    assert.equal(lista.body.itens[0].ativo, true);
  });

  it('valida categoria, nome e valores', async () => {
    const criar = (body) => ctx.req('/api/materiais', { method: 'POST', cookie: s.admin, body });
    for (const categoria of ['', ' ', 'x', 'c'.repeat(51), 123, null]) {
      const res = await criar({ ...material, categoria });
      assert.equal(res.status, 422, JSON.stringify(categoria));
      assert.match(res.body.error, /Categoria inválida/);
    }
    assert.equal((await criar({ ...material, nome: '' })).status, 422);
    assert.equal((await criar({ ...material, custo_unitario: -0.01 })).status, 422);
    assert.equal((await criar({ ...material, lucro_fixo: 'muito' })).status, 422);
    assert.equal((await criar({ categoria: 'Kraft', nome: 'Kraft 80g' })).status, 201, 'valores omitidos assumem zero');
  });

  it('administrador cria uma categoria nova e ela passa a ser listada', async () => {
    const res = await ctx.req('/api/materiais', { method: 'POST', cookie: s.admin, body: { ...material, categoria: '  Papel fotográfico ', nome: 'Fotográfico 180g' } });
    assert.equal(res.status, 201);
    const lista = await ctx.req('/api/materiais', { cookie: s.atendente });
    assert.equal(lista.body.categorias.length, 17);
    assert.equal(lista.body.categorias.at(-1), 'Papel fotográfico');
    assert.ok(lista.body.itens.some((m) => m.categoria === 'Papel fotográfico' && m.nome === 'Fotográfico 180g'));
    assert.equal((await ctx.req('/api/materiais', { method: 'POST', cookie: s.atendente, body: { ...material, categoria: 'Outra' } })).status, 403);
  });

  it('edita e faz remoção lógica, preservando o registro', async () => {
    const editar = await ctx.req(`/api/materiais/${idMaterial}`, { method: 'PUT', cookie: s.admin, body: { ...material, nome: 'Offset 90g', custo_unitario: 0.2 } });
    assert.equal(editar.status, 200);
    assert.equal((await ctx.req('/api/materiais/999999', { method: 'PUT', cookie: s.admin, body: material })).status, 404);

    const remover = await ctx.req(`/api/materiais/${idMaterial}`, { method: 'DELETE', cookie: s.admin });
    assert.equal(remover.status, 200);
    assert.match(remover.body.message, /preservados/);
    const lista = await ctx.req('/api/materiais', { cookie: s.atendente });
    assert.ok(!lista.body.itens.some((m) => m.id_material === idMaterial));
    const { rows } = await ctx.db.query('SELECT nome, ativo FROM material WHERE id_material = $1', [idMaterial]);
    assert.deepEqual(rows[0], { nome: 'Offset 90g', ativo: false });
    assert.equal((await ctx.req(`/api/materiais/${idMaterial}`, { method: 'DELETE', cookie: s.admin })).status, 404);
    assert.equal((await ctx.req(`/api/materiais/${idMaterial}`, { method: 'PUT', cookie: s.admin, body: material })).status, 404);
  });
});
});
