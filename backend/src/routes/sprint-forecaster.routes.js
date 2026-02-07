const express = require('express');
const router = express.Router();
const controller = require('../controllers/sprint-forecaster.controller');

router.post('/analyze', controller.analyzeSprint);
router.post('/simulate', controller.simulateScenario);

module.exports = router;
