const db = require('../config/db');
const { HttpError, id, data, status, numero, texto } = require('../utils/validation');
const { calcularOrcamento } = require('../services/quoteCalculation');
const { renderOrcamentoPdf } = require('../services/orcamentoPdf.service');
const baseSelect = `SELECT o.*, c.nome AS nome_cliente, c.email, c.telefone, c.cpf_cnpj, c.endereco
 FROM orcamento o LEFT JOIN cliente c ON c.id_cliente = o.id_cliente`;
async function audit(conn, userId, recordId, action, before, after) {
  await conn.query('INSERT INTO historico_log (id_usuario,tabela_afetada,id_registro,acao,valor_antigo,valor_novo,data_hora) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [userId, 'orcamento', recordId, action, before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after)]);
}
async function removerItens(conn, ids) {
  if (!ids.length) return;
  for (const table of ['acabamento_item', 'item_corte', 'servico_item']) await conn.query(`DELETE FROM ${table} WHERE id_item IN (?)`, [ids]);
  await conn.query('DELETE FROM item WHERE id_item IN (?)', [ids]);
}
async function persistir(req, res, editing) {
  const calculo = calcularOrcamento(req.body);
  const clienteId = req.body.id_cliente == null ? null : id(req.body.id_cliente);
  const validade = data(req.body.data_validade);
  const entrega = data(req.body.prazo_entrega);
  const observacoes = texto(req.body.observacoes, 'Observações', 5000);
  const recordId = editing ? id(req.params.id) : null;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    let anterior;
    let antigos = [];
    if (editing) {
      const [rows] = await connection.query('SELECT * FROM orcamento WHERE id_orcamento = ? FOR UPDATE', [recordId]);
      anterior = rows[0];
      if (!anterior) throw new HttpError(404, 'Orçamento não encontrado.');
      if (numero(req.body.versao, 'Versão', { min: 1, inteiro: true }) !== anterior.versao) throw new HttpError(409, 'Este orçamento foi alterado por outra pessoa. Recarregue antes de editar.');
      [antigos] = await connection.query('SELECT * FROM item WHERE id_orcamento = ?', [recordId]);
    }
    if (clienteId !== null) {
      const [clientes] = await connection.query('SELECT id_cliente FROM cliente WHERE id_cliente = ?', [clienteId]);
      if (!clientes.length) throw new HttpError(422, 'Cliente não encontrado. Selecione um cliente cadastrado ou continue sem cliente.');
    }
    const snapshots = [];
    const idsUsados = new Set();
    for (const item of calculo.itens) {
      const antigo = antigos.find(i => i.id_item === item.id_item);
      if (item.id_item && (!antigo || idsUsados.has(item.id_item))) throw new HttpError(422, 'Item inválido para este orçamento.');
      if (item.id_item) idsUsados.add(item.id_item);
      if (item.id_material == null) {
        if (!antigo) throw new HttpError(422, 'Selecione um material do catálogo.');
        snapshots.push(antigo.precificacao_snapshot);
      } else if (antigo && antigo.id_material === item.id_material) {
        snapshots.push(antigo.precificacao_snapshot);
      } else {
        const [materials] = await connection.query('SELECT * FROM material WHERE id_material = ? AND ativo = 1', [item.id_material]);
        if (!materials.length) throw new HttpError(422, 'Material indisponível. Atualize o catálogo.');
        item.tipo_produto = materials[0].nome;
        snapshots.push(JSON.stringify(materials[0]));
      }
    }
    const quantidade = calculo.itens.reduce((sum, i) => sum + i.quantidade, 0);
    const valores = [clienteId, calculo.valor_total, calculo.valor_total / quantidade, quantidade, validade, entrega, observacoes, calculo.subtotal, calculo.desconto_tipo, calculo.desconto_valor];
    let savedId = recordId;
    if (editing) {
      await connection.query(`UPDATE orcamento SET id_cliente=?, valor_total=?, valor_unitario=?, quantidade=?, data_validade=?, prazo_entrega=?, observacoes=?, subtotal=?, desconto_tipo=?, desconto_valor=?, versao=versao+1 WHERE id_orcamento=?`, [...valores, savedId]);
      await removerItens(connection, antigos.filter(i => !idsUsados.has(i.id_item)).map(i => i.id_item));
    } else {
      const [created] = await connection.query(`INSERT INTO orcamento (id_cliente,valor_total,valor_unitario,quantidade,data_validade,prazo_entrega,observacoes,subtotal,desconto_tipo,desconto_valor,id_usuario,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [...valores, req.usuario.id_usuario, 'Não aprovado']);
      savedId = created.insertId;
    }
    for (let index = 0; index < calculo.itens.length; index++) {
      const item = calculo.itens[index];
      const values = [item.id_material, item.tipo_produto, item.quantidade, item.valor_unitario, item.valor_total, snapshots[index]];
      if (item.id_item) await connection.query('UPDATE item SET id_material=?,tipo_produto=?,quantidade=?,valor_unitario=?,valor_total=?,precificacao_snapshot=? WHERE id_item=? AND id_orcamento=?', [...values, item.id_item, savedId]);
      else await connection.query('INSERT INTO item (id_material,tipo_produto,quantidade,valor_unitario,valor_total,precificacao_snapshot,id_orcamento) VALUES (?,?,?,?,?,?,?)', [...values, savedId]);
    }
    await audit(connection, req.usuario.id_usuario, savedId, editing ? 'editar' : 'criar', anterior && { total: anterior.valor_total, versao: anterior.versao }, { total: calculo.valor_total, itens: calculo.itens.length });
    await connection.commit();
    res.status(editing ? 200 : 201).json({ id: savedId, id_orcamento: savedId, valor_total: calculo.valor_total, versao: editing ? anterior.versao + 1 : 1 });
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
const criarOrcamento = (req, res) => persistir(req, res, false);
const editarOrcamento = (req, res) => persistir(req, res, true);
async function listarOrcamentos(req, res) {
  const page = numero(req.query.page ?? 1, 'Página', { min: 1, max: 1000000, inteiro: true });
  const limit = numero(req.query.limit ?? 20, 'Limite', { min: 1, max: 100, inteiro: true });
  const search = texto(req.query.busca, 'Busca', 100);
  let where = ' WHERE 1=1'; const params = [];
  if (search) { where += ' AND (CAST(o.id_orcamento AS CHAR) = ? OR c.nome LIKE ? OR c.email LIKE ?)'; params.push(search, `%${search}%`, `%${search}%`); }
  if (req.query.status) {
    const filter = status(req.query.status);
    if (filter === 'Não aprovado') where += " AND o.status IN ('Aberto','Pré-Orçamento','Em análise','Não aprovado')";
    else if (filter === 'Aprovado') where += " AND o.status IN ('Aprovado','Finalizado')";
    else { where += ' AND o.status = ?'; params.push(filter); }
  }
  const [[count]] = await db.query('SELECT COUNT(*) AS total FROM orcamento o LEFT JOIN cliente c ON c.id_cliente = o.id_cliente' + where, params);
  const [itens] = await db.query(baseSelect + where + ' ORDER BY o.id_orcamento DESC LIMIT ? OFFSET ?', [...params, limit, (page - 1) * limit]);
  res.json({ itens, total: count.total, page, limit });
}
async function obterOrcamento(req, res) {
  const recordId = id(req.params.id);
  const [rows] = await db.query(baseSelect + ' WHERE o.id_orcamento = ?', [recordId]);
  if (!rows.length) throw new HttpError(404, 'Orçamento não encontrado.');
  const [itens] = await db.query('SELECT * FROM item WHERE id_orcamento = ? ORDER BY id_item', [recordId]);
  res.json({ ...rows[0], itens });
}
async function deletarOrcamento(req, res) {
  const recordId = id(req.params.id);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT id_orcamento, valor_total FROM orcamento WHERE id_orcamento = ? FOR UPDATE', [recordId]);
    if (!rows.length) throw new HttpError(404, 'Orçamento não encontrado.');
    const [itens] = await conn.query('SELECT id_item FROM item WHERE id_orcamento = ?', [recordId]);
    await removerItens(conn, itens.map(i => i.id_item));
    await conn.query('DELETE FROM documento WHERE id_orcamento = ?', [recordId]);
    await conn.query('DELETE FROM orcamento WHERE id_orcamento = ?', [recordId]);
    await audit(conn, req.usuario.id_usuario, recordId, 'excluir', { total: rows[0].valor_total }, null);
    await conn.commit();
    res.json({ message: 'Orçamento excluído.' });
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}
async function obterStatusOrcamento(req, res) {
  const [rows] = await db.query(baseSelect + ' WHERE o.id_orcamento = ?', [id(req.params.id)]);
  if (!rows.length) throw new HttpError(404, 'Orçamento não encontrado.');
  res.json({ ...rows[0], id: rows[0].id_orcamento, nomeCliente: rows[0].nome_cliente, valor: rows[0].valor_total });
}
async function atualizarStatusOrcamento(req, res) {
  const recordId = id(req.params.id); const novo = status(req.body.status);
  const versao = numero(req.body.versao, 'Versão', { min: 1, inteiro: true });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT status, versao FROM orcamento WHERE id_orcamento = ? FOR UPDATE', [recordId]);
    if (!rows.length) throw new HttpError(404, 'Orçamento não encontrado.');
    if (rows[0].versao !== versao) throw new HttpError(409, 'Orçamento alterado por outra pessoa. Atualize a página.');
    await conn.query('UPDATE orcamento SET status = ?, versao = versao + 1 WHERE id_orcamento = ?', [novo, recordId]);
    await audit(conn, req.usuario.id_usuario, recordId, 'status', { status: rows[0].status }, { status: novo });
    await conn.commit(); res.json({ status: novo, versao: versao + 1 });
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}
async function gerarPdfOrcamento(req, res) {
  const [rows] = await db.query(baseSelect + ' WHERE o.id_orcamento = ?', [id(req.params.id)]);
  if (!rows.length) throw new HttpError(404, 'Orçamento não encontrado.');
  const orcamento = rows[0];
  if (!['Aprovado', 'Finalizado'].includes(orcamento.status)) throw new HttpError(409, 'Aprove o orçamento antes de gerar o PDF.');
  const [itens] = await db.query('SELECT tipo_produto, quantidade, valor_unitario, valor_total FROM item WHERE id_orcamento = ? ORDER BY id_item', [orcamento.id_orcamento]);
  res.type('pdf').set('Content-Disposition', `attachment; filename="orcamento-${orcamento.id_orcamento}.pdf"`);
  renderOrcamentoPdf({ ...orcamento, cliente: { nome: orcamento.nome_cliente, cpf_cnpj: orcamento.cpf_cnpj, telefone: orcamento.telefone, email: orcamento.email, endereco: orcamento.endereco }, itens }, res);
}
module.exports = { criarOrcamento, editarOrcamento, listarOrcamentos, obterOrcamento, deletarOrcamento, obterStatusOrcamento, atualizarStatusOrcamento, gerarPdfOrcamento };
