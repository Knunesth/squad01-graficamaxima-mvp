const { capturarErro } = require('../helpers/env');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calcularOrcamento } = require('../../src/services/quoteCalculation');

const item = (extra = {}) => ({ tipo_produto: 'Cartão', quantidade: 10, valor_unitario: 2.5, ...extra });

function espera422(body, trecho) {
  const erro = capturarErro(() => calcularOrcamento(body));
  assert.equal(erro.status, 422);
  if (trecho) assert.match(erro.message, trecho);
}

describe('calcularOrcamento — itens', () => {
  it('calcula total do item, subtotal e total sem desconto', () => {
    const r = calcularOrcamento({ itens: [item(), item({ quantidade: 4, valor_unitario: 12.5 })] });
    assert.equal(r.itens[0].valor_total, 25);
    assert.equal(r.itens[1].valor_total, 50);
    assert.equal(r.subtotal, 75);
    assert.equal(r.desconto, 0);
    assert.equal(r.valor_total, 75);
    assert.equal(r.desconto_tipo, 'percentual');
  });

  it('exige de 1 a 17 itens em um array', () => {
    espera422({}, /1 a 17/);
    espera422({ itens: 'x' }, /1 a 17/);
    espera422({ itens: [] }, /1 a 17/);
    espera422({ itens: Array.from({ length: 18 }, () => item()) }, /1 a 17/);
    assert.equal(calcularOrcamento({ itens: Array.from({ length: 17 }, () => item()) }).itens.length, 17);
  });

  it('valida quantidade inteira positiva', () => {
    espera422({ itens: [item({ quantidade: 0 })] }, /Quantidade do item 1/);
    espera422({ itens: [item(), item({ quantidade: 1.5 })] }, /Quantidade do item 2/);
    espera422({ itens: [item({ quantidade: -3 })] });
    espera422({ itens: [item({ quantidade: 'muitas' })] });
  });

  it('valida valor unitário e nome do material', () => {
    espera422({ itens: [item({ valor_unitario: -1 })] }, /Valor unitário/);
    espera422({ itens: [item({ valor_unitario: undefined })] }, /Valor unitário/);
    espera422({ itens: [item({ tipo_produto: '' })] }, /Material/);
    espera422({ itens: [item({ tipo_produto: 'x'.repeat(101) })] }, /Material/);
  });

  it('normaliza ids opcionais de material e item', () => {
    const r = calcularOrcamento({ itens: [item({ id_material: '3', id_item: 9 }), item()] });
    assert.equal(r.itens[0].id_material, 3);
    assert.equal(r.itens[0].id_item, 9);
    assert.equal(r.itens[1].id_material, null);
    assert.equal(r.itens[1].id_item, null);
    espera422({ itens: [item({ id_material: 0 })] }, /ID/);
  });

  it('aceita números enviados como string', () => {
    const r = calcularOrcamento({ itens: [item({ quantidade: '3', valor_unitario: '1.10' })] });
    assert.equal(r.itens[0].valor_total, 3.3);
  });

  it('não acumula erro de ponto flutuante', () => {
    const r = calcularOrcamento({ itens: [item({ quantidade: 3, valor_unitario: 0.1 }), item({ quantidade: 1, valor_unitario: 0.2 })] });
    assert.equal(r.itens[0].valor_total, 0.3);
    assert.equal(r.subtotal, 0.5);
  });
});

describe('calcularOrcamento — desconto', () => {
  const itens = [item({ quantidade: 10, valor_unitario: 10 })];

  it('aplica desconto percentual', () => {
    const r = calcularOrcamento({ itens, desconto_tipo: 'percentual', desconto_valor: 10 });
    assert.equal(r.desconto, 10);
    assert.equal(r.valor_total, 90);
  });

  it('aplica desconto em valor', () => {
    const r = calcularOrcamento({ itens, desconto_tipo: 'valor', desconto_valor: 30 });
    assert.equal(r.desconto, 30);
    assert.equal(r.valor_total, 70);
  });

  it('permite desconto total, mas nunca maior que o subtotal', () => {
    assert.equal(calcularOrcamento({ itens, desconto_tipo: 'percentual', desconto_valor: 100 }).valor_total, 0);
    assert.equal(calcularOrcamento({ itens, desconto_tipo: 'valor', desconto_valor: 100 }).valor_total, 0);
    espera422({ itens, desconto_tipo: 'percentual', desconto_valor: 100.01 }, /Desconto/);
    espera422({ itens, desconto_tipo: 'valor', desconto_valor: 100.01 }, /Desconto/);
    espera422({ itens, desconto_valor: -1 }, /Desconto/);
  });

  it('rejeita tipo de desconto desconhecido', () => {
    espera422({ itens, desconto_tipo: 'cupom', desconto_valor: 1 }, /Tipo de desconto/);
  });

  it('arredonda o desconto percentual para 4 casas', () => {
    const r = calcularOrcamento({ itens: [item({ quantidade: 1, valor_unitario: 0.3333 })], desconto_valor: 33.33 });
    assert.equal(r.desconto, 0.1111);
    assert.equal(r.valor_total, 0.2222);
  });
});
