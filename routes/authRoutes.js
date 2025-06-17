const express = require('express');
const router = express.Router();

const {
  signup,
  login,
  updateUser,
  getUserProfiles,
  getUserProfileById,
  sendOtp,
  verifyOtp
} = require('../controller/authController'); // ✅ fixed spelling here

const { uploadProduct } = require('../middleware/upload');

// Routes
router.post('/signup', uploadProduct.single('profileImage'), signup);
router.put('/update-user/:userId', uploadProduct.single('profileImage'), updateUser);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/get-user-profiles', getUserProfiles);
router.get('/users/:userId', getUserProfileById);

module.exports = router;
