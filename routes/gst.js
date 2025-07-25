const express = require('express');
const router = express.Router();
const { verifyAndSaveGSTIN } = require('../controllers/gstController');

router.post('/verify', verifyAndSaveGSTIN);

module.exports = router;
