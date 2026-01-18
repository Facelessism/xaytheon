const express = require('express');
const router = express.Router();
const collabController = require('../controllers/collab.controller');

router.post('/invite', collabController.createInvite);
router.get('/status/:roomId', collabController.getRoomStatus);

module.exports = router;
