const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflow.controller');

router.post('/generate', workflowController.generateYaml);
router.get('/templates', workflowController.getTemplates);

module.exports = router;
