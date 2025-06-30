const express = require('express');
const router = express.Router();
const adminController = require('../controllar/adminController');
const upload = require('../utils/multer');

router.post('/login', adminController.login);
router.post('/request-otp', adminController.requestOtp);
router.put('/update-profile', upload.single('profilePhoto'), adminController.updateProfilePhoto);
router.put('/verify-update', adminController.verifyAndUpdate);


module.exports = router;
