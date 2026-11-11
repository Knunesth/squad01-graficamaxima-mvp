require('../helpers/env');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getCatchupTargets, getSchedulerStatus, scheduledDate } = require('../../src/services/reporting/reportScheduler');

// Horários em UTC; São Paulo = UTC-3. Agenda padrão: semanal na segunda às
// 08:00 e mensal no dia 1 às 08:00, sempre referente ao período anterior.
const alvos = (iso, extra = {}) => getCatchupTargets({ now: new Date(iso), timezone: 'America/Sao_Paulo', ...extra });

describe('reportScheduler.getCatchupTargets', () => {
  it('no meio da semana recupera a última semana e o último mês fechados', () => {
    // Quarta, 11/11/2026, 12:00 em São Paulo.
    assert.deepEqual(alvos('2026-11-11T15:00:00Z'), [
      { type: 'weekly', date: '2026-11-08' },
      { type: 'monthly', date: '2026-10-31' },
    ]);
  });

  it('na segunda antes das 08:00 ainda não dispara o semanal', () => {
    // Segunda, 09/11/2026, 07:00 em São Paulo.
    assert.deepEqual(alvos('2026-11-09T10:00:00Z'), [{ type: 'monthly', date: '2026-10-31' }]);
  });

  it('na segunda às 08:00 em ponto já dispara o semanal', () => {
    assert.deepEqual(alvos('2026-11-09T11:00:00Z'), [
      { type: 'weekly', date: '2026-11-08' },
      { type: 'monthly', date: '2026-10-31' },
    ]);
  });

  it('no dia 1 antes das 08:00 ainda não dispara o mensal', () => {
    // Domingo, 01/11/2026, 07:59 em São Paulo: só o semanal da segunda anterior.
    assert.deepEqual(alvos('2026-11-01T10:59:00Z'), [{ type: 'weekly', date: '2026-10-25' }]);
  });

  it('usa a data local do fuso, não a data UTC', () => {
    // 01/12/2026 02:00 UTC ainda é 30/11 23:00 em São Paulo (segunda-feira).
    assert.deepEqual(alvos('2026-12-01T02:00:00Z'), [
      { type: 'weekly', date: '2026-11-29' },
      { type: 'monthly', date: '2026-10-31' },
    ]);
  });

  it('respeita dia da semana e horário configurados (7 equivale a domingo)', () => {
    // Domingo, 15/11/2026, 19:00 em São Paulo, com cron de domingo às 18:30.
    assert.deepEqual(alvos('2026-11-15T22:00:00Z', { weeklyCron: '30 18 * * 7', monthlyCron: 'invalido' }), [
      { type: 'weekly', date: '2026-11-14' },
    ]);
  });

  it('ignora expressões cron que não consegue interpretar com segurança', () => {
    assert.deepEqual(alvos('2026-11-11T15:00:00Z', { weeklyCron: '*/5 * * * *', monthlyCron: '0 8 15 * *' }), []);
    assert.deepEqual(alvos('2026-11-11T15:00:00Z', { weeklyCron: '0 25 * * 1', monthlyCron: '61 8 1 * *' }), []);
  });
});

describe('reportScheduler — estado', () => {
  it('começa inativo até startReportScheduler ser chamado', () => {
    assert.deepEqual(getSchedulerStatus(), { active: false, timezone: null });
  });

  it('scheduledDate devolve o dia anterior no formato YYYY-MM-DD', () => {
    const ontem = scheduledDate('America/Sao_Paulo');
    assert.match(ontem, /^\d{4}-\d{2}-\d{2}$/);
    const diferenca = Date.now() - new Date(`${ontem}T00:00:00Z`).getTime();
    assert.ok(diferenca > 0 && diferenca < 3 * 86400000, 'deve estar entre hoje e três dias atrás');
  });
});
