const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/DashBoardController');

// GET /api/dashboard?mes=YYYY-MM
router.get('/', dashboardController);

module.exports = router;
