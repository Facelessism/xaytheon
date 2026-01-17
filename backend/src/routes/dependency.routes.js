const express = require('express');
const router = express.Router();
const dependencyController = require('../controllers/dependency.controller');

router.get('/graph', dependencyController.getGraphData);

module.exports = router;
