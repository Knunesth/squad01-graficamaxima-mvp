const { capturarErro } = require('../helpers/env');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const v = require('../../src/utils/validation');

function espera422(fn, trecho) {
  const erro = capturarErro(fn);
  assert.ok(erro instanceof v.HttpError, 'deve lançar HttpError');
  assert.equal(erro.status, 422);
  if (trecho) assert.match(erro.message, trecho);
}

describe('validation.numero', () => {
  it('aceita número e string numérica', () => {
    assert.equal(v.numero(5, 'Campo'), 5);
    assert.equal(v.numero('12.5', 'Campo'), 12.5);
    assert.equal(v.numero(0, 'Campo'), 0);
  });

  it('rejeita valores ausentes ou de outro tipo', () => {
    for (const valor of [null, undefined, '', '   ', true, {}, []]) {
      espera422(() => v.numero(valor, 'Campo'), /informe um número/);
    }
  });

  it('rejeita texto não numérico, NaN e infinito', () => {
    for (const valor of ['abc', '1,5', NaN, Infinity, '1e999']) {
      espera422(() => v.numero(valor, 'Campo'), /valor inválido/);
    }
  });

  it('respeita mínimo, máximo e inteiro', () => {
    espera422(() => v.numero(-1, 'Campo'));
    espera422(() => v.numero(1e9 + 1, 'Campo'));
    espera422(() => v.numero(1.5, 'Campo', { inteiro: true }));
    assert.equal(v.numero(-5, 'Campo', { min: -10 }), -5);
    assert.equal(v.numero(3, 'Campo', { min: 1, max: 3, inteiro: true }), 3);
  });

  it('inclui o nome do campo na mensagem', () => {
    espera422(() => v.numero('x', 'Quantidade'), /^Quantidade:/);
  });
});

describe('validation.id', () => {
  it('aceita inteiros positivos dentro do int4', () => {
    assert.equal(v.id('7'), 7);
    assert.equal(v.id(2147483647), 2147483647);
  });

  it('rejeita zero, negativos, decimais e acima do int4', () => {
    for (const valor of [0, -1, '1.5', 2147483648, 'abc', null]) espera422(() => v.id(valor));
  });
});

describe('validation.texto', () => {
  it('apara espaços e devolve string vazia para opcional ausente', () => {
    assert.equal(v.texto('  olá  ', 'Campo'), 'olá');
    assert.equal(v.texto(null, 'Campo'), '');
    assert.equal(v.texto(undefined, 'Campo'), '');
  });

  it('rejeita obrigatório ausente ou só com espaços', () => {
    espera422(() => v.texto(undefined, 'Nome', 100, true), /obrigatório/);
    espera422(() => v.texto('   ', 'Nome', 100, true), /obrigatório/);
  });

  it('rejeita tipos que não são string e textos acima do limite', () => {
    espera422(() => v.texto(123, 'Campo'));
    espera422(() => v.texto({ $ne: '' }, 'Campo'));
    espera422(() => v.texto('a'.repeat(11), 'Campo', 10));
    assert.equal(v.texto('a'.repeat(10), 'Campo', 10), 'a'.repeat(10));
  });

  it('mede o limite depois de aparar espaços', () => {
    assert.equal(v.texto(`  ${'a'.repeat(10)}  `, 'Campo', 10), 'a'.repeat(10));
  });
});

describe('validation.data', () => {
  it('aceita datas ISO reais e trata vazio como nulo', () => {
    assert.equal(v.data('2026-11-11'), '2026-11-11');
    assert.equal(v.data('2024-02-29'), '2024-02-29');
    assert.equal(v.data(null), null);
    assert.equal(v.data(''), null);
  });

  it('aceita a data-hora ISO que a própria API devolve, guardando só a data', () => {
    assert.equal(v.data('2026-12-15T03:00:00.000Z'), '2026-12-15');
    assert.equal(v.data('2026-12-15T00:00'), '2026-12-15');
    espera422(() => v.data('2026-02-30T03:00:00.000Z'), /Data inválida/);
    espera422(() => v.data('2026-12-15 03:00'), /Data inválida/);
  });

  it('rejeita formatos errados e datas que não existem', () => {
    for (const valor of ['11/11/2026', '2026-13-01', '2026-02-30', '2025-02-29', '2026-1-1', 20261111]) {
      espera422(() => v.data(valor), /Data inválida/);
    }
  });
});

describe('validation.status', () => {
  it('aceita somente os status conhecidos', () => {
    for (const valor of v.STATUS) assert.equal(v.status(valor), valor);
    assert.equal(v.STATUS.length, 8);
    for (const valor of ['aprovado', 'Cancelado', '', null]) espera422(() => v.status(valor), /Status inválido/);
  });
});

describe('validation.dinheiro', () => {
  it('arredonda para 4 casas decimais', () => {
    assert.equal(v.dinheiro(0.1 + 0.2), 0.3);
    assert.equal(v.dinheiro(1.00005), 1.0001);
    assert.equal(v.dinheiro(1.00004), 1);
    assert.equal(v.dinheiro(10), 10);
  });
});
