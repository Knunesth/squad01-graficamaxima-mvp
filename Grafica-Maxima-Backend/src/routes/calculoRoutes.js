const express = require('express');
const router = express.Router();
const { apenasAdmin } = require('../middlewares/AuthRole');

// Aponta corretamente para o controller do Back-end
const metroQuadradoController = require('../controllers/MetroQuadradoController');

// 📥 Rotas de Leitura e Processamento
router.get('/tipos', metroQuadradoController.listarTipos);
router.post('/metro-quadrado/simulacao', metroQuadradoController.simular);
router.post('/metro-quadrado', metroQuadradoController.calcular);

// 🚀 NOVA ROTA ADICIONADA: Permite que a tela de Configurações atualize o precos.json
router.put('/tipos/atualizar', apenasAdmin, metroQuadradoController.atualizarPreco);

module.exports = router;
