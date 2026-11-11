import { describe, expect, it } from 'vitest';
import { aprovado, dataBR, dataISO, decimal, documentoBR, inteiro, moeda, telefoneBR } from '@/shared/utils/format.js';
import { mensagemErro } from '@/shared/services/api.js';
import { cn } from '@/shared/utils/cn.js';

// Intl usa espaço não separável entre "R$" e o valor.
const semNbsp = (texto) => texto.replace(/\u00a0/g, ' ');

describe('format', () => {
  it('moeda formata em reais, inclusive strings numéricas do banco', () => {
    expect(semNbsp(moeda(1234.5))).toBe('R$ 1.234,50');
    expect(semNbsp(moeda('27.0000'))).toBe('R$ 27,00');
    expect(semNbsp(moeda(-10))).toBe('-R$ 10,00');
  });

  it('moeda trata vazio como zero', () => {
    for (const valor of [null, undefined, '', 0]) expect(semNbsp(moeda(valor))).toBe('R$ 0,00');
  });

  it('decimal mostra de 2 a 4 casas', () => {
    expect(decimal(1)).toBe('1,00');
    expect(decimal('0.1800')).toBe('0,18');
    expect(decimal(0.12345)).toBe('0,1235');
    expect(decimal(1234.5)).toBe('1.234,50');
    expect(decimal(null)).toBe('0,00');
  });

  it('dataBR converte data ISO e devolve travessão para vazio ou inválido', () => {
    expect(dataBR('2026-11-11')).toBe('11/11/2026');
    expect(dataBR('2026-12-31T03:00:00.000Z')).toBe('31/12/2026');
    for (const valor of [null, undefined, '', '11/11/2026', 'ontem']) expect(dataBR(valor)).toBe('—');
  });

  it('aprovado considera Aprovado e Finalizado', () => {
    expect(aprovado('Aprovado')).toBe(true);
    expect(aprovado('Finalizado')).toBe(true);
    for (const status of ['Não aprovado', 'Em negociação', 'Inativo', 'aprovado', undefined]) expect(aprovado(status)).toBe(false);
  });

});

describe('format — máscaras', () => {
  it('documentoBR formata CPF e CNPJ, inclusive durante a digitação', () => {
    expect(documentoBR('11111111111')).toBe('111.111.111-11');
    expect(documentoBR('12345678000190')).toBe('12.345.678/0001-90');
    expect(documentoBR('1234')).toBe('123.4');
    expect(documentoBR('111.111.111-11')).toBe('111.111.111-11');
    expect(documentoBR(null)).toBe('');
  });

  it('telefoneBR formata fixo e celular', () => {
    expect(telefoneBR('61999111001')).toBe('(61) 99911-1001');
    expect(telefoneBR('6133334444')).toBe('(61) 3333-4444');
    expect(telefoneBR('61 99911-1001')).toBe('(61) 99911-1001');
    expect(telefoneBR('6')).toBe('(6');
    expect(telefoneBR('')).toBe('');
  });

  it('dataISO devolve AAAA-MM-DD a partir de data ou data-hora', () => {
    expect(dataISO('2026-12-15T03:00:00.000Z')).toBe('2026-12-15');
    expect(dataISO('2026-12-15')).toBe('2026-12-15');
    for (const valor of [null, undefined, '', '15/12/2026']) expect(dataISO(valor)).toBe('');
  });

  it('inteiro usa separador de milhar', () => {
    expect(inteiro(12500)).toBe('12.500');
    expect(inteiro(null)).toBe('0');
  });
});

describe('mensagemErro', () => {
  const padrao = 'Não foi possível conectar ao servidor. Tente novamente.';

  it('prioriza a mensagem enviada pela API', () => {
    expect(mensagemErro({ response: { status: 422, data: { error: 'CPF ou CNPJ já cadastrado.' } } })).toBe('CPF ou CNPJ já cadastrado.');
  });

  it('explica tempo esgotado', () => {
    expect(mensagemErro({ code: 'ECONNABORTED' })).toMatch(/demorou mais que o esperado/);
  });

  it('usa mensagem de conexão quando a API não fornece detalhes', () => {
    for (const status of [401, 403, 404, 500, 502, 503, 504]) expect(mensagemErro({ response: { status } })).toBe(padrao);
  });

  it('usa a mensagem padrão nos demais casos', () => {
    expect(mensagemErro(new Error('falha interna'))).toBe(padrao);
    expect(mensagemErro({ response: { status: 418 } })).toBe(padrao);
  });
});

describe('cn', () => {
  it('junta classes condicionais e resolve conflitos do Tailwind', () => {
    const oculto = [].length > 0;
    expect(cn('button', oculto && 'oculto', { ativo: true, inativo: false }, ['extra'])).toBe('button ativo extra');
    expect(cn('p-2 text-sm', 'p-4')).toBe('text-sm p-4');
    expect(cn()).toBe('');
  });
});
