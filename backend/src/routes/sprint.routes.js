const express = require('express');
const router = express.Router();
const controller = require('../controllers/sprint.controller');

router.post('/optimize', controller.getSprintPlans);
router.post('/recalculate', controller.recalculatePlan);

module.exports = router;
