const express = require('express');
const router = express.Router();
const adminController = require('../controllar/adminController');
const memoryUpload = require('../utils/gcloud');

// ✅ Admin Registration & Login
router.post('/admin-register', adminController.register);
router.post('/login', adminController.login);

// ✅ Profile Photo Update
router.patch(
  '/profile/:id',
  memoryUpload.single('profilePhoto'),
  adminController.updateProfilePhoto
);

module.exports = router;
