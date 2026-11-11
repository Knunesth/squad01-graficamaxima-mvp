const cron = require("node-cron");
const { calculateReport } = require("./reportService");
const { addDays, todayAtTimezone } = require("./period");

function scheduledDate(timezone) {
  const today = new Date(`${todayAtTimezone(timezone)}T00:00:00.000Z`);
  return addDays(today, -1).toISOString().slice(0, 10);
}

function startReportScheduler(env = process.env) {
  const timezone = env.REPORT_TIMEZONE || "America/Sao_Paulo";
  const jobs = [];
  const schedules = [
    ["weekly", env.REPORT_WEEKLY_CRON || "0 8 * * 1"],
    ["monthly", env.REPORT_MONTHLY_CRON || "0 8 1 * *"],
  ];

  for (const [type, expression] of schedules) {
    if (!cron.validate(expression)) {
      throw new Error(`Expressão cron inválida para relatório ${type}: ${expression}`);
    }
    jobs.push(cron.schedule(
      expression,
      async () => {
        try {
          const report = await calculateReport(type, scheduledDate(timezone));
          console.info(`Relatório ${type} gerado: ${report.id_relatorio}`);
        } catch (error) {
          console.error(`Falha ao gerar relatório ${type}:`, error.message);
        }
      },
      { timezone },
    ));
  }
  console.info(`Agendamentos de relatórios ativos (${timezone}).`);
  return () => jobs.forEach((job) => job.stop());
}

module.exports = { startReportScheduler, scheduledDate };
