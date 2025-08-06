const express = require('express');
const router = express.Router();
const { getAllTranslatedData } = require('../controllar/translationController');

router.get('/translated-data', getAllTranslatedData);

module.exports = router;
