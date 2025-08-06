// routes/translationRoutes.js
const express = require('express');
const router = express.Router();
const { translate } = require('../controllers/translationController');

router.post('/translate', translate);

module.exports = router;
