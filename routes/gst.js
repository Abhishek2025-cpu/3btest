const express = require('express');
const router = express.Router();
const { verifyAndSaveGSTIN } = require('../controllar/gstController');

router.get('/verify', verifyAndSaveGSTIN);

module.exports = router;
