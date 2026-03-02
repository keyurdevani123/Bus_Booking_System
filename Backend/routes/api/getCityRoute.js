const express = require('express');
const router = express.Router();
const CITY_ROUTE = require('../../utils/cityRoute');

// GET /api/cityRoute  —  returns the ordered city list with km values
router.get('/', (req, res) => {
  res.json(CITY_ROUTE);
});

module.exports = router;
