// routes/gstRoutes.js

const express = require('express');
const router = express.Router();

// Import your controller function
const {verifyAndSaveGst, getGstByUser } = require('../controllar/gstController'); // Make sure this path is correct

// THIS IS THE LINE TO CHECK:
// It tells the router: "When you get a GET request for the '/verify' path, execute the verifyAndSaveGSTIN function."
// router.get('/verify', verifyAndSaveGSTIN);


// ✅ Save GST number
router.post('/gst/verify', verifyAndSaveGst);

// ✅ Get GST number by user
router.get('/gst/:userId', getGstByUser);
module.exports = router;