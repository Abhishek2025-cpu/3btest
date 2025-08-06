// routes/translationRoutes.js
const express = require('express');
const router = express.Router();
const { translate } = require('../controllar/translationController');

router.post('/translate', translate);

module.exports = router;
