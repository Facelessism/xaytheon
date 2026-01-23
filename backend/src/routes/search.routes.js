const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');

router.get('/smart', searchController.smartSearch);
router.get('/autocomplete', searchController.getAutocomplete);

module.exports = router;
