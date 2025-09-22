const express = require('express');
const router = express.Router();

const {
  signup,
  login,
  updateUser,
  getUserProfiles,
  getUserProfileById,
  deleteUserById,
  loginSendOtp,
  loginVerifyOtp

} = require('../controllar/authController'); 
const otpController = require('../controllar/otpController');
const { uploadProduct } = require('../middleware/upload');

// Routes
router.post('/signup', uploadProduct.single('profileImage'), signup);
router.put('/update-user/:userId', uploadProduct.single('profileImage'), updateUser);
router.post('/login', login);
router.post('/send-otp', otpController.sendOtp);
router.post('/verify-otp', otpController.verifyOtp);
router.get('/get-user-profiles', getUserProfiles);
router.get('/users/:userId', getUserProfileById);
router.delete('/users/:userId',deleteUserById);
router.post('/login/send-otp', loginSendOtp);
router.post('/login/verify-otp', loginVerifyOtp);
///////////////////////////////////////

module.exports = router;
