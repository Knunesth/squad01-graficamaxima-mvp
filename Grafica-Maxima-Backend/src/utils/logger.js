const allowedKeys = new Set([
  'requestId', 'method', 'statusCode', 'durationMs', 'code', 'errorType', 'job', 'result',
  'count', 'database', 'scheduler', 'port', 'deliveryId', 'maskedPhone',
]);

function write(level, event, fields = {}) {
  const safeFields = Object.fromEntries(Object.entries(fields).filter(([key, value]) =>
    allowedKeys.has(key) && (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string'),
  ));
  const line = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...safeFields });
  (level === 'error' ? process.stderr : process.stdout).write(`${line}\n`);
}

module.exports = {
  info: (event, fields) => write('info', event, fields),
  warn: (event, fields) => write('warn', event, fields),
  error: (event, fields) => write('error', event, fields),
};
