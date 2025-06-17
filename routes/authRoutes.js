const express = require('express');
const router = express.Router();
const { signup, login,updateUser,getUserProfiles,getUserProfileById } = require('../controllar/authController');
const { uploadPrifle } = require('../middleware/upload');
const otpController = require('../controllar/authController');

router.post('/signup', uploadPrifle.single('profileImage'), signup);
router.put('/update-user/:userId', uploadPrifle.single('profileImage'), updateUser);
router.post('/login', login);
router.post('/send-otp', otpController.sendOtp);//updated 
router.post('/verify-otp', otpController.verifyOtp);

router.get('/get-user-profiles', getUserProfiles);
router.get('/users/:userId', getUserProfileById);

module.exports = router;
