const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/DashBoardController');
const { autenticar } = require('../middlewares/AuthRole');

// GET /api/dashboard?mes=YYYY-MM
router.get('/', autenticar, dashboardController);

module.exports = router;
