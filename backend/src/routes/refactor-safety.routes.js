const express = require('express');
const router = express.Router();
const controller = require('../controllers/refactor-safety.controller');

router.post('/analyze', controller.analyzeRefactor);
router.post('/checkpoint', controller.createCheckpoint);
router.post('/rollback', controller.rollback);

module.exports = router;
