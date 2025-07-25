const express = require('express');
const router = express.Router();
const { verifyAndSaveGSTIN } = require('../controllar/gstController');

router.post('/verify', verifyAndSaveGSTIN);

module.exports = router;
