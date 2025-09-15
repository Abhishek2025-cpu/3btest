const express = require("express");
const router = express.Router();
const { getUserNotifications,clearUserNotifications } = require("../controllar/notificationController");
const { sendPushNotification } = require('../controllar/pushNotificationController');


router.get("/notifications/:userId", getUserNotifications);
router.delete("/notifications/clear/:userId", clearUserNotifications);
router.post('/send-push', sendPushNotification);


module.exports = router;
