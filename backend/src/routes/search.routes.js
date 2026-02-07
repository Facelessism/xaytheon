const express = require('express');
const rateLimit = require('express-rate-limit');
const searchController = require('../controllers/search.controller');

const router = express.Router();

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

const validateQuery = (req, res, next) => {
  const q = req.query.q;
  if (!q || q.length < 2 || q.length > 200) {
    return res.status(400).json({ message: 'Invalid search query' });
  }
  next();
};

router.get('/smart', searchLimiter, validateQuery, searchController.smartSearch);
router.get('/autocomplete', searchLimiter, validateQuery, searchController.getAutocomplete);

module.exports = router;
