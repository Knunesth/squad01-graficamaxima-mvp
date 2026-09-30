const { HttpError, numero, texto, id, dinheiro } = require('../utils/validation');

function calcularOrcamento(body) {
  if (!Array.isArray(body.itens) || body.itens.length < 1 || body.itens.length > 17) throw new HttpError(422, 'Selecione de 1 a 17 materiais.');
  const itens = body.itens.map((item, index) => {
    const quantidade = numero(item.quantidade, `Quantidade do item ${index + 1}`, { min: 1, max: 10000000, inteiro: true });
    const valor_unitario = dinheiro(numero(item.valor_unitario, 'Valor unitário', { max: 10000000 }));
    return {
      id_material: item.id_material == null ? null : id(item.id_material),
      id_item: item.id_item == null ? null : id(item.id_item),
      tipo_produto: texto(item.tipo_produto, 'Material', 100, true), quantidade, valor_unitario,
      valor_total: dinheiro(numero(quantidade * valor_unitario, 'Total do item', { max: 1e12 })),
    };
  });
  const subtotal = dinheiro(numero(itens.reduce((sum, item) => sum + item.valor_total, 0), 'Subtotal', { max: 1e12 }));
  const desconto_tipo = body.desconto_tipo ?? 'percentual';
  if (!['percentual', 'valor'].includes(desconto_tipo)) throw new HttpError(422, 'Tipo de desconto inválido.');
  const desconto_valor = numero(body.desconto_valor ?? 0, 'Desconto', { max: desconto_tipo === 'percentual' ? 100 : subtotal });
  const desconto = dinheiro(desconto_tipo === 'percentual' ? subtotal * desconto_valor / 100 : desconto_valor);
  return { itens, subtotal, desconto_tipo, desconto_valor, desconto, valor_total: dinheiro(subtotal - desconto) };
}
module.exports = { calcularOrcamento };
