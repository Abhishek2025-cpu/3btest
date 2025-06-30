const express = require('express');
const router = express.Router();
const adminController = require('../controllar/adminController');
// Import the new middleware for memory storage
const memoryUpload = require('../utils/memoryUpload');

// Authentication
router.post('/login', adminController.login);

// Password/Number Recovery and Update
router.post('/request-otp', adminController.requestOtp);
router.put('/verify-and-update', adminController.verifyAndUpdate);

// Profile Update - Use PATCH for partial updates and ID in URL
router.patch(
  '/profile/:id', 
  memoryUpload.single('profilePhoto'), 
  adminController.updateProfilePhoto
);

module.exports = router;
