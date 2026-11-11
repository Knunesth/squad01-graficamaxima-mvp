require('../helpers/env');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calcularMetroQuadrado } = require('../../src/services/MetroQuadradoService');

const precos = { banner: 48, adesivo: 36 };
const base = { tipo_servico: 'banner', largura: 2, altura: 1.5, quantidade: 2 };

describe('calcularMetroQuadrado', () => {
  it('calcula área, custo e valores por peça', () => {
    const { sucesso, resultado } = calcularMetroQuadrado(base, precos);
    assert.equal(sucesso, true);
    assert.deepEqual(resultado, {
      tipo_servico: 'banner',
      dimensoes: { largura_m: 2, altura_m: 1.5, area_por_peca_m2: 3 },
      quantidade: 2,
      area_total_m2: 6,
      preco_por_m2: 48,
      custo_por_peca: 144,
      custo_total: 288,
      margem_lucro_pct: 0,
      valor_margem: 0,
      valor_unitario: 144,
      valor_total: 288,
    });
  });

  it('normaliza o tipo de serviço (maiúsculas e espaços)', () => {
    const { sucesso, resultado } = calcularMetroQuadrado({ ...base, tipo_servico: '  BANNER ' }, precos);
    assert.equal(sucesso, true);
    assert.equal(resultado.tipo_servico, 'banner');
  });

  it('aplica o acréscimo percentual sobre o custo', () => {
    const { resultado } = calcularMetroQuadrado({ ...base, margem_lucro: 10 }, precos);
    assert.equal(resultado.valor_total, 316.8);
    assert.equal(resultado.valor_margem, 28.8);
    assert.equal(resultado.valor_unitario, 158.4);
  });

  it('aceita medidas e quantidade como string', () => {
    const { sucesso, resultado } = calcularMetroQuadrado({ tipo_servico: 'adesivo', largura: '0.5', altura: '0.5', quantidade: '4' }, precos);
    assert.equal(sucesso, true);
    assert.equal(resultado.area_total_m2, 1);
    assert.equal(resultado.valor_total, 36);
  });

  it('rejeita tipo de serviço fora da tabela, inclusive chaves do protótipo', () => {
    for (const tipo of ['lona', 'constructor', '__proto__', 'toString']) {
      const retorno = calcularMetroQuadrado({ ...base, tipo_servico: tipo }, precos);
      assert.equal(retorno.sucesso, false);
      assert.equal(retorno.erros[0].campo, 'tipo_servico');
    }
  });

  it('devolve erro estruturado para dados inválidos, sem lançar', () => {
    const casos = [
      { ...base, largura: 0 },
      { ...base, altura: -1 },
      { ...base, quantidade: 0 },
      { ...base, quantidade: 1.5 },
      { ...base, largura: 1001 },
      { ...base, margem_lucro: 1001 },
      { ...base, tipo_servico: undefined },
      undefined,
      null,
    ];
    for (const dados of casos) {
      const retorno = calcularMetroQuadrado(dados, precos);
      assert.equal(retorno.sucesso, false, JSON.stringify(dados));
      assert.equal(retorno.erros[0].campo, 'dados');
      assert.equal(typeof retorno.erros[0].mensagem, 'string');
    }
  });

  // Comportamento atual, registrado de propósito: o preço por m² e a margem
  // podem vir do corpo da requisição e substituem a tabela do banco.
  // Ver RELATORIO_SISTEMA.md (achado sobre preço controlado pelo cliente HTTP).
  it('usa preco_por_m2 do corpo quando informado (comportamento atual)', () => {
    const { resultado } = calcularMetroQuadrado({ ...base, preco_por_m2: 10 }, precos);
    assert.equal(resultado.preco_por_m2, 10);
    assert.equal(resultado.valor_total, 60);
  });
});
