const express = require('express');
const cors = require('cors');
const { autenticar } = require('./middlewares/AuthRole');
const errorHandler = require('./middlewares/errorHandler');
const { getAllowedOrigins } = require('./config/cors');
const { parseTrustProxy } = require('./config/trustProxy');
const { randomUUID } = require('node:crypto');
const db = require('./config/db');
const { getSchedulerStatus } = require('./services/reporting/reportScheduler');
const logger = require('./utils/logger');
function createApp() {
  const app = express();
  const origins = getAllowedOrigins();
  app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    res.once('finish', () => logger.info('http_request', {
      requestId: req.requestId,
      method: req.method,
      statusCode: res.statusCode,
      durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,
    }));
    next();
  });
  app.use(cors({ origin: origins, credentials: true }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin && !origins.includes(req.headers.origin)) return res.status(403).json({ error: 'Origem não permitida.' });
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.get('/', (req, res) => res.json({ status: 'ok', message: 'Servidor da Gráfica Máxima funcionando.' }));
  app.get('/health', async (req, res) => {
    let database = 'ok';
    try { await db.query('SELECT 1'); } catch { database = 'unavailable'; }
    const scheduler = getSchedulerStatus().active ? 'active' : 'inactive';
    const healthy = database === 'ok' && scheduler === 'active';
    res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'unhealthy', checks: { database, scheduler } });
  });
  app.use('/api/auth', require('./routes/AuthRoutes'));
  app.use('/api', autenticar);
  app.use('/api/orcamentos', require('./routes/orcamentosRoutes'));
  app.use('/api/clientes', require('./routes/clientesRoutes'));
  app.use('/api/materiais', require('./routes/materiaisRoutes'));
  app.use('/api/calculo', require('./routes/calculoRoutes'));
  app.use('/api/reports', require('./routes/reportRoutes'));
  app.get('/api/dashboard', require('./controllers/DashBoardController'));
  app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
