const express = require('express');
const cors = require('cors');
const { autenticar } = require('./middlewares/AuthRole');
const errorHandler = require('./middlewares/errorHandler');
function createApp() {
  const app = express();
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim());
  app.disable('x-powered-by');
  app.use(cors({ origin: origins, credentials: true }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin && !origins.includes(req.headers.origin)) return res.status(403).json({ error: 'Origem não permitida.' });
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', require('./routes/AuthRoutes'));
  app.use('/api', autenticar);
  app.use('/api/orcamentos', require('./routes/orcamentosRoutes'));
  app.use('/api/clientes', require('./routes/clientesRoutes'));
  app.use('/api/materiais', require('./routes/materiaisRoutes'));
  app.use('/api/calculo', require('./routes/calculoRoutes'));
  app.get('/api/dashboard', require('./controllers/DashBoardController'));
  app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
