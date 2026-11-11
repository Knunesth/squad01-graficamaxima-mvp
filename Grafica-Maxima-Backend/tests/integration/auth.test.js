const { iniciar, criarSessoes, motivoParaPular, SENHAS } = require('../helpers/integracao');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

describe('API — autenticação e usuários', { skip: motivoParaPular() }, () => {
  let ctx;
  let s;
  const novo = { login: 'Novo.Usuario', senha: 'senha-do-novo-usuario-1' };
  let idNovo;

  before(async () => {
    ctx = await iniciar();
    s = await criarSessoes(ctx);
  });
  after(() => ctx?.encerrar());

  it('login devolve cookie httpOnly de 8 horas e não expõe o hash', async () => {
    const res = await ctx.req('/api/auth/login', { method: 'POST', body: { login: 'admin_teste', senha: SENHAS.admin } });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { usuario: { id_usuario: s.idAdmin, nome: 'Admin de Teste', login: 'admin_teste', tipo: 'admin' } });
    const cookie = res.headers.get('set-cookie');
    assert.match(cookie, /^grafica_session=[\w-]+\.[\w-]+\.[\w-]+;/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.match(cookie, /Max-Age=28800/i);
    assert.match(cookie, /Path=\//i);
  });

  it('aceita login por e-mail e ignora maiúsculas', async () => {
    for (const login of ['admin@teste.example', 'ADMIN_TESTE', '  admin_teste  ']) {
      const res = await ctx.req('/api/auth/login', { method: 'POST', body: { login, senha: SENHAS.admin } });
      assert.equal(res.status, 200, login);
    }
  });

  it('responde a mesma mensagem para senha errada e usuário inexistente', async () => {
    const errada = await ctx.req('/api/auth/login', { method: 'POST', body: { login: 'admin_teste', senha: 'senha-incorreta-123' } });
    const inexistente = await ctx.req('/api/auth/login', { method: 'POST', body: { login: 'ninguem', senha: 'senha-incorreta-123' } });
    assert.equal(errada.status, 401);
    assert.equal(inexistente.status, 401);
    assert.deepEqual(errada.body, inexistente.body);
    assert.equal(errada.headers.get('set-cookie'), null);
  });

  it('/me devolve o usuário da sessão por cookie ou por Bearer', async () => {
    const esperado = { usuario: { id_usuario: s.idAtendente, nome: 'Atendente de Teste', login: 'atendente_teste', tipo: 'atendente' } };
    const porCookie = await ctx.req('/api/auth/me', { cookie: s.atendente });
    assert.equal(porCookie.status, 200);
    assert.deepEqual(porCookie.body, esperado);
    const token = s.atendente.split('=')[1];
    const porBearer = await ctx.req('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    assert.deepEqual(porBearer.body, esperado);
  });

  it('cadastro cria conta inativa, com login em minúsculas', async () => {
    const res = await ctx.req('/api/auth/register', { method: 'POST', body: novo });
    assert.equal(res.status, 201);
    assert.match(res.body.message, /Aguarde a liberação/);
    const { rows } = await ctx.db.query("SELECT id_usuario, login, tipo, ativo, senha_hash FROM usuario WHERE login = 'novo.usuario'");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].tipo, 'atendente');
    assert.equal(rows[0].ativo, false);
    assert.match(rows[0].senha_hash, /^scrypt\$/);
    idNovo = rows[0].id_usuario;
  });

  it('cadastro nunca cria administrador, mesmo que o corpo peça', async () => {
    const res = await ctx.req('/api/auth/register', { method: 'POST', body: { login: 'quer.ser.admin', senha: 'senha-bem-longa-123', tipo: 'admin', ativo: true } });
    assert.equal(res.status, 201);
    const { rows } = await ctx.db.query("SELECT tipo, ativo FROM usuario WHERE login = 'quer.ser.admin'");
    assert.deepEqual(rows[0], { tipo: 'atendente', ativo: false });
  });

  it('recusa login duplicado', async () => {
    const res = await ctx.req('/api/auth/register', { method: 'POST', body: { login: 'NOVO.usuario', senha: 'outra-senha-longa-123' } });
    assert.equal(res.status, 409);
  });

  it('conta ainda não liberada não consegue entrar', async () => {
    const res = await ctx.req('/api/auth/login', { method: 'POST', body: novo });
    assert.equal(res.status, 401);
    assert.match(res.body.error, /não liberada/);
  });

  it('só administrador lista e altera usuários', async () => {
    assert.equal((await ctx.req('/api/auth/usuarios', { cookie: s.atendente })).status, 403);
    assert.equal((await ctx.req(`/api/auth/usuarios/${idNovo}`, { method: 'PATCH', cookie: s.atendente, body: { tipo: 'admin', ativo: true } })).status, 403);
    const lista = await ctx.req('/api/auth/usuarios', { cookie: s.admin });
    assert.equal(lista.status, 200);
    const pendente = lista.body.find((u) => u.id_usuario === idNovo);
    assert.deepEqual(pendente, { id_usuario: idNovo, nome: 'novo.usuario', login: 'novo.usuario', tipo: 'atendente', ativo: false });
    for (const usuario of lista.body) assert.ok(!('senha_hash' in usuario) && !('token_version' in usuario));
  });

  it('valida a alteração de permissões', async () => {
    const patch = (id, body) => ctx.req(`/api/auth/usuarios/${id}`, { method: 'PATCH', cookie: s.admin, body });
    assert.equal((await patch(idNovo, { tipo: 'gerente', ativo: true })).status, 422);
    assert.equal((await patch(idNovo, { tipo: 'atendente', ativo: 'sim' })).status, 422);
    assert.equal((await patch('abc', { tipo: 'atendente', ativo: true })).status, 422);
    assert.equal((await patch(999999, { tipo: 'atendente', ativo: true })).status, 404);
    const proprio = await patch(s.idAdmin, { tipo: 'atendente', ativo: false });
    assert.equal(proprio.status, 409);
    assert.match(proprio.body.error, /próprias permissões/);
  });

  it('depois de liberada pelo admin, a conta entra normalmente', async () => {
    const liberar = await ctx.req(`/api/auth/usuarios/${idNovo}`, { method: 'PATCH', cookie: s.admin, body: { tipo: 'atendente', ativo: true } });
    assert.equal(liberar.status, 200);
    const cookie = await ctx.login(novo.login, novo.senha);
    assert.equal((await ctx.req('/api/clientes', { cookie })).status, 200);
  });

  it('troca de senha exige a senha atual, regras mínimas e encerra sessões antigas', async () => {
    const cookie = await ctx.login(novo.login, novo.senha);
    const trocar = (body, c = cookie) => ctx.req('/api/auth/password', { method: 'POST', cookie: c, body });
    assert.equal((await trocar({ senha_atual: 'senha-errada-12345', nova_senha: 'senha-nova-do-usuario-2' })).status, 401);
    assert.equal((await trocar({ senha_atual: novo.senha, nova_senha: 'curta' })).status, 422);
    assert.equal((await trocar({ senha_atual: novo.senha, nova_senha: novo.senha })).status, 422);
    assert.equal((await ctx.req('/api/auth/password', { method: 'POST', body: { senha_atual: novo.senha, nova_senha: 'senha-nova-do-usuario-2' } })).status, 401);

    const ok = await trocar({ senha_atual: novo.senha, nova_senha: 'senha-nova-do-usuario-2' });
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get('set-cookie'), /^grafica_session=;/);

    const antiga = await ctx.req('/api/clientes', { cookie });
    assert.equal(antiga.status, 401);
    assert.match(antiga.body.error, /Sessão expirada/);
    assert.equal((await ctx.req('/api/auth/login', { method: 'POST', body: novo })).status, 401);
    novo.senha = 'senha-nova-do-usuario-2';
    assert.equal((await ctx.req('/api/clientes', { cookie: await ctx.login(novo.login, novo.senha) })).status, 200);
  });

  it('admin redefine a senha de outra conta e derruba as sessões dela', async () => {
    const cookie = await ctx.login(novo.login, novo.senha);
    const redefinir = (id, body, c = s.admin) => ctx.req(`/api/auth/usuarios/${id}/senha`, { method: 'PATCH', cookie: c, body });
    assert.equal((await redefinir(idNovo, { nova_senha: 'senha-redefinida-pelo-admin' }, s.atendente)).status, 403);
    assert.equal((await redefinir(idNovo, { nova_senha: 'curta' })).status, 422);
    assert.equal((await redefinir(s.idAdmin, { nova_senha: 'senha-redefinida-pelo-admin' })).status, 409);
    assert.equal((await redefinir(999999, { nova_senha: 'senha-redefinida-pelo-admin' })).status, 404);
    assert.equal((await redefinir(idNovo, { nova_senha: 'senha-redefinida-pelo-admin' })).status, 200);
    assert.equal((await ctx.req('/api/clientes', { cookie })).status, 401);
    novo.senha = 'senha-redefinida-pelo-admin';
    await ctx.login(novo.login, novo.senha);
  });

  it('desativar a conta invalida a sessão em uso e bloqueia novo login', async () => {
    const cookie = await ctx.login(novo.login, novo.senha);
    assert.equal((await ctx.req(`/api/auth/usuarios/${idNovo}`, { method: 'PATCH', cookie: s.admin, body: { tipo: 'atendente', ativo: false } })).status, 200);
    const res = await ctx.req('/api/clientes', { cookie });
    assert.equal(res.status, 401);
    assert.match(res.body.error, /Sessão inválida/);
    assert.equal((await ctx.req('/api/auth/login', { method: 'POST', body: novo })).status, 401);
  });

  it('promoção a admin vale na requisição seguinte, sem novo login', async () => {
    assert.equal((await ctx.req('/api/auth/usuarios', { cookie: s.atendente })).status, 403);
    await ctx.req(`/api/auth/usuarios/${s.idAtendente}`, { method: 'PATCH', cookie: s.admin, body: { tipo: 'admin', ativo: true } });
    assert.equal((await ctx.req('/api/auth/usuarios', { cookie: s.atendente })).status, 200);
    await ctx.req(`/api/auth/usuarios/${s.idAtendente}`, { method: 'PATCH', cookie: s.admin, body: { tipo: 'atendente', ativo: true } });
    assert.equal((await ctx.req('/api/auth/usuarios', { cookie: s.atendente })).status, 403);
  });

  it('logout limpa o cookie de sessão', async () => {
    const res = await ctx.req('/api/auth/logout', { method: 'POST', cookie: s.atendente });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('set-cookie'), /^grafica_session=;/);
  });
});
