// routes/gstRoutes.js

const express = require('express');
const router = express.Router();

// Import your controller function
const { verifyAndSaveGSTIN } = require('../controllar/gstController'); // Make sure this path is correct

// THIS IS THE LINE TO CHECK:
// It tells the router: "When you get a GET request for the '/verify' path, execute the verifyAndSaveGSTIN function."
router.get('/verify', verifyAndSaveGSTIN);

module.exports = router;