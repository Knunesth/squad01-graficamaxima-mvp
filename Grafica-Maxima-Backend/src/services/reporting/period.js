const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value) {
  if (!DATE_PATTERN.test(value || "")) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateString(date) {
  return date.toISOString().slice(0, 10);
}

function utcAtTimezoneMidnight(date, timezone) {
  const [year, month, day] = dateString(date).split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, 0, 0, 0);
  let guess = target;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess)).map(({ type, value }) => [type, value]),
    );
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    guess += target - localAsUtc;
  }
  return new Date(guess).toISOString();
}

function getPeriod(type, dateValue, timezone = process.env.REPORT_TIMEZONE || "America/Sao_Paulo") {
  if (!['weekly', 'monthly'].includes(type)) {
    const error = new Error("Tipo de relatório inválido. Use weekly ou monthly.");
    error.status = 422;
    throw error;
  }
  const date = parseDate(dateValue);
  if (!date) {
    const error = new Error("Data inválida. Use o formato YYYY-MM-DD.");
    error.status = 422;
    throw error;
  }

  let start;
  let nextStart;
  if (type === "weekly") {
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    start = addDays(date, -mondayOffset);
    nextStart = addDays(start, 7);
  } else {
    start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    nextStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  }

  const previousStart = type === "weekly"
    ? addDays(start, -7)
    : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1));
  const previousNextStart = start;
  return {
    type,
    start: dateString(start),
    end: dateString(addDays(nextStart, -1)),
    previousStart: dateString(previousStart),
    previousEnd: dateString(addDays(previousNextStart, -1)),
    startUtc: utcAtTimezoneMidnight(start, timezone),
    nextStartUtc: utcAtTimezoneMidnight(nextStart, timezone),
    previousStartUtc: utcAtTimezoneMidnight(previousStart, timezone),
    previousNextStartUtc: utcAtTimezoneMidnight(previousNextStart, timezone),
    timezone,
  };
}

function todayAtTimezone(timezone = process.env.REPORT_TIMEZONE || "America/Sao_Paulo") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

module.exports = { getPeriod, todayAtTimezone, addDays, parseDate };
