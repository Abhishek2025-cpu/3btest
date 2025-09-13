const express = require('express');
const router = express.Router();
const { sendPushNotification } = require('../controllar/pushNotificationController');

router.post('/send-push', sendPushNotification);

module.exports = router;
