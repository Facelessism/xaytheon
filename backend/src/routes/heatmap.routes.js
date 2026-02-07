const express = require('express');
const router = express.Router();
const heatmapController = require('../controllers/heatmap.controller');

/**
 * GET /api/heatmap
 * Optional query params:
 *  - username: string
 */
router.get('/', heatmapController.getHeatmapData);

module.exports = router;
