const express = require('express');
const router = express.Router();
const sentimentController = require('../controllers/sentiment.controller');

router.get('/analyze', sentimentController.analyzeRepo);

module.exports = router;
