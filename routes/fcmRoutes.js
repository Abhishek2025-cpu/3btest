const express = require('express');
const router = express.Router();
const fcmController = require('../controllar/fcmController'); 

router.post('/add-fcm', fcmController.saveFcmToken);
router.put('/update-fcm', fcmController.updateFcmToken);

module.exports = router;
