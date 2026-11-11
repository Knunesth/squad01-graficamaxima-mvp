const { capturarErro } = require('../helpers/env');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getPeriod, todayAtTimezone, addDays, parseDate } = require('../../src/services/reporting/period');

describe('period.getPeriod — semanal', () => {
  it('usa a semana de segunda a domingo que contém a data', () => {
    // 11/11/2026 é uma quarta-feira.
    const p = getPeriod('weekly', '2026-11-11', 'America/Sao_Paulo');
    assert.equal(p.start, '2026-11-09');
    assert.equal(p.end, '2026-11-15');
    assert.equal(p.previousStart, '2026-11-02');
    assert.equal(p.previousEnd, '2026-11-08');
    assert.equal(p.type, 'weekly');
    assert.equal(p.timezone, 'America/Sao_Paulo');
  });

  it('trata segunda e domingo como bordas da mesma semana', () => {
    assert.equal(getPeriod('weekly', '2026-11-09', 'UTC').start, '2026-11-09');
    assert.equal(getPeriod('weekly', '2026-11-15', 'UTC').start, '2026-11-09');
    assert.equal(getPeriod('weekly', '2026-11-16', 'UTC').start, '2026-11-16');
  });

  it('atravessa a virada de ano', () => {
    const p = getPeriod('weekly', '2027-01-01', 'UTC');
    assert.equal(p.start, '2026-12-28');
    assert.equal(p.end, '2027-01-03');
  });

  it('converte a meia-noite local para UTC (São Paulo = UTC-3)', () => {
    const p = getPeriod('weekly', '2026-11-11', 'America/Sao_Paulo');
    assert.equal(p.startUtc, '2026-11-09T03:00:00.000Z');
    assert.equal(p.nextStartUtc, '2026-11-16T03:00:00.000Z');
    assert.equal(p.previousStartUtc, '2026-11-02T03:00:00.000Z');
    assert.equal(p.previousNextStartUtc, p.startUtc);
  });
});

describe('period.getPeriod — mensal', () => {
  it('cobre o mês inteiro e o mês anterior', () => {
    const p = getPeriod('monthly', '2026-03-15', 'UTC');
    assert.equal(p.start, '2026-03-01');
    assert.equal(p.end, '2026-03-31');
    assert.equal(p.previousStart, '2026-02-01');
    assert.equal(p.previousEnd, '2026-02-28');
    assert.equal(p.startUtc, '2026-03-01T00:00:00.000Z');
    assert.equal(p.nextStartUtc, '2026-04-01T00:00:00.000Z');
  });

  it('em janeiro, o período anterior é dezembro do ano anterior', () => {
    const p = getPeriod('monthly', '2026-01-10', 'UTC');
    assert.equal(p.previousStart, '2025-12-01');
    assert.equal(p.previousEnd, '2025-12-31');
  });

  it('respeita fevereiro bissexto', () => {
    assert.equal(getPeriod('monthly', '2024-02-10', 'UTC').end, '2024-02-29');
  });

  it('acompanha a mudança de horário de verão do fuso informado', () => {
    // Nova York: 1º de março em EST (UTC-5), 1º de abril já em EDT (UTC-4).
    const p = getPeriod('monthly', '2026-03-20', 'America/New_York');
    assert.equal(p.startUtc, '2026-03-01T05:00:00.000Z');
    assert.equal(p.nextStartUtc, '2026-04-01T04:00:00.000Z');
  });
});

describe('period.getPeriod — entradas inválidas', () => {
  it('rejeita tipo desconhecido com status 422', () => {
    for (const tipo of ['daily', '', undefined]) {
      const erro = capturarErro(() => getPeriod(tipo, '2026-11-11'));
      assert.equal(erro.status, 422);
      assert.match(erro.message, /weekly ou monthly/);
    }
  });

  it('rejeita data fora do formato ou inexistente com status 422', () => {
    for (const data of ['11/11/2026', '2026-02-30', '2026-13-01', '', undefined, null]) {
      const erro = capturarErro(() => getPeriod('weekly', data));
      assert.equal(erro.status, 422);
      assert.match(erro.message, /YYYY-MM-DD/);
    }
  });
});

describe('period — utilitários', () => {
  it('parseDate devolve Date em UTC ou null', () => {
    assert.equal(parseDate('2026-11-11').toISOString(), '2026-11-11T00:00:00.000Z');
    assert.equal(parseDate('2026-02-31'), null);
    assert.equal(parseDate('ontem'), null);
  });

  it('addDays não altera a data original e atravessa meses', () => {
    const origem = parseDate('2026-01-31');
    assert.equal(addDays(origem, 1).toISOString().slice(0, 10), '2026-02-01');
    assert.equal(addDays(origem, -31).toISOString().slice(0, 10), '2025-12-31');
    assert.equal(origem.toISOString().slice(0, 10), '2026-01-31');
  });

  it('todayAtTimezone devolve YYYY-MM-DD', () => {
    assert.match(todayAtTimezone('America/Sao_Paulo'), /^\d{4}-\d{2}-\d{2}$/);
    assert.match(todayAtTimezone('Pacific/Kiritimati'), /^\d{4}-\d{2}-\d{2}$/);
  });
});
