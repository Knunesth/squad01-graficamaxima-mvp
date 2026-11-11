const cron = require("node-cron");
const db = require("../../config/db");
const { getReport } = require("./reportService");
const { addDays, parseDate, todayAtTimezone } = require("./period");
const { sendReport } = require("../whatsapp/deliveryService");
const logger = require("../../utils/logger");

const REPORT_JOB_LOCK = 781513205;
let schedulerActive = false;
let activeTimezone = null;

function scheduledDate(timezone) {
  const today = new Date(`${todayAtTimezone(timezone)}T00:00:00.000Z`);
  return addDays(today, -1).toISOString().slice(0, 10);
}

function localDate(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function cronTime(expression, expectedDayField) {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return null;
  const hour = Number(parts[1]);
  const minute = Number(parts[0]);
  if (hour > 23 || minute > 59) return null;
  if (expectedDayField === "weekly" && (parts[2] !== "*" || parts[3] !== "*" || !/^\d+$/.test(parts[4]))) return null;
  if (expectedDayField === "monthly" && (parts[2] !== "1" || parts[3] !== "*" || parts[4] !== "*")) return null;
  return { hour, minute, weekday: expectedDayField === "weekly" ? Number(parts[4]) % 7 : undefined };
}

function timePassed(now, date, hour, minute, timezone) {
  const today = localDate(now, timezone);
  if (date < today) return true;
  if (date > today) return false;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  return Number(parts.hour) * 60 + Number(parts.minute) >= hour * 60 + minute;
}

function getCatchupTargets({ now = new Date(), timezone = "America/Sao_Paulo", weeklyCron = "0 8 * * 1", monthlyCron = "0 8 1 * *" } = {}) {
  const today = parseDate(localDate(now, timezone));
  const targets = [];
  const weekly = cronTime(weeklyCron, "weekly");
  if (weekly) {
    const offset = (today.getUTCDay() - weekly.weekday + 7) % 7;
    const scheduled = addDays(today, -offset);
    const scheduledString = scheduled.toISOString().slice(0, 10);
    if (timePassed(now, scheduledString, weekly.hour, weekly.minute, timezone)) {
      targets.push({ type: "weekly", date: addDays(scheduled, -1).toISOString().slice(0, 10) });
    }
  }

  const monthly = cronTime(monthlyCron, "monthly");
  if (monthly) {
    const [year, month] = localDate(now, timezone).split("-").map(Number);
    const scheduled = new Date(Date.UTC(year, month - 1, 1));
    const scheduledString = scheduled.toISOString().slice(0, 10);
    if (timePassed(now, scheduledString, monthly.hour, monthly.minute, timezone)) {
      targets.push({ type: "monthly", date: addDays(scheduled, -1).toISOString().slice(0, 10) });
    }
  }
  return targets;
}

async function withReportLock(operation) {
  const client = await db.getClient();
  try {
    const { rows } = await client.query("SELECT pg_try_advisory_lock($1) AS acquired", [REPORT_JOB_LOCK]);
    if (!rows[0].acquired) return { locked: false };
    try {
      return { locked: true, value: await operation() };
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [REPORT_JOB_LOCK]);
    }
  } finally {
    client.release();
  }
}

async function processPeriod(type, date, providerFactory) {
  const report = await getReport(type, date);
  const delivery = await sendReport(report, { skipSent: true, providerFactory });
  return { reportId: report.id_relatorio, type, date, delivery };
}

async function runReportCatchup({ env = process.env, now = new Date(), providerFactory } = {}) {
  const timezone = env.REPORT_TIMEZONE || "America/Sao_Paulo";
  const targets = getCatchupTargets({
    now,
    timezone,
    weeklyCron: env.REPORT_WEEKLY_CRON || "0 8 * * 1",
    monthlyCron: env.REPORT_MONTHLY_CRON || "0 8 1 * *",
  });
  return withReportLock(async () => {
    const results = [];
    for (const target of targets) {
      results.push(await processPeriod(target.type, target.date, providerFactory));
    }
    return results;
  });
}

async function runScheduledPeriod(type, date) {
  return withReportLock(() => processPeriod(type, date));
}

function startReportScheduler(env = process.env) {
  const timezone = env.REPORT_TIMEZONE || "America/Sao_Paulo";
  const schedules = [
    ["weekly", env.REPORT_WEEKLY_CRON || "0 8 * * 1"],
    ["monthly", env.REPORT_MONTHLY_CRON || "0 8 1 * *"],
  ];
  const jobs = schedules.map(([type, expression]) => {
    if (!cron.validate(expression)) throw new Error(`Expressão cron inválida para relatório ${type}: ${expression}`);
    return cron.schedule(expression, async () => {
      try {
        const result = await runScheduledPeriod(type, scheduledDate(timezone));
        logger.info('scheduled_report_checked', { job: type, result: result.locked ? 'processed' : 'lock_unavailable' });
      } catch (error) {
        logger.error('scheduled_report_failed', { job: type, code: error.code, errorType: error.name });
      }
    }, { timezone });
  });

  void runReportCatchup({ env }).then((result) => {
    if (!result.locked) return logger.info('report_catchup_checked', { result: 'lock_unavailable' });
    logger.info('report_catchup_checked', { result: 'completed', count: result.value.length });
  }).catch((error) => logger.error('report_catchup_failed', { code: error.code, errorType: error.name }));

  schedulerActive = true;
  activeTimezone = timezone;
  logger.info('report_scheduler_started', { result: 'active' });
  return () => {
    jobs.forEach((job) => job.stop());
    schedulerActive = false;
    activeTimezone = null;
  };
}

function getSchedulerStatus() {
  return { active: schedulerActive, timezone: activeTimezone };
}

module.exports = { startReportScheduler, getSchedulerStatus, scheduledDate, getCatchupTargets, runReportCatchup, runScheduledPeriod };
