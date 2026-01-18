const express = require('express');
const router = express.Router();
const heatmapController = require('../controllers/heatmap.controller');

router.get('/', heatmapController.getHeatmapData);

module.exports = router;
