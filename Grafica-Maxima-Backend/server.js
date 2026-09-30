const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3301;

// ==========================================
// 1. MIDDLEWARES
// ==========================================
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true   // Necessário para cookies de autenticação
}));
app.use(express.json());

// ==========================================
// 2. IMPORTANDO AS ROTAS
// ==========================================
const authRotas          = require('./src/routes/AuthRoutes');
const orcamentoRoutes    = require('./src/routes/orcamentosRoutes');
const configuracoesRoutes = require('./src/routes/configuracoesRoutes');
const calculoRoutes      = require('./src/routes/calculoRoutes');
const dashboardRoutes    = require('./src/routes/dashboardRoutes');
const materiaisRoutes    = require('./src/routes/materiaisRoutes');

// ==========================================
// 3. VINCULANDO AS ROTAS NO EXPRESS
// ==========================================
app.use('/api/auth',          authRotas);           // Login, registro, logout, /me
app.use('/api/orcamentos',    orcamentoRoutes);      // CRUD de orçamentos + PDF
app.use('/api/calculo',       calculoRoutes);        // Calculadora de m²
app.use('/api/configuracoes', configuracoesRoutes);  // Acabamentos e cortes
app.use('/api/dashboard',     dashboardRoutes);      // Métricas do painel
app.use('/api/materiais',     materiaisRoutes);      // CRUD da nova tabela material

// Healthcheck
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor da Gráfica Máxima funcionando.' });
});

// ==========================================
// 4. MIDDLEWARE GLOBAL DE ERROS
// ==========================================
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Erro interno no servidor.';
    console.error(`[ERRO ${status}] ${req.method} ${req.path} —`, message);
    res.status(status).json({ error: message });
});

app.listen(port, () => {
    console.log(`Servidor Gráfica Máxima rodando na porta ${port}`);
});
