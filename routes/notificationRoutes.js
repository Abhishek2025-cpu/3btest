const express = require("express");
const router = express.Router();
const { getUserNotifications,clearUserNotifications,sendPushNotification } = require("../controllar/notificationController");
// const { sendPushNotification } = require('../controllar/pushNotificationController');


router.get("/notifications/:userId", getUserNotifications);
router.delete("/notifications/clear/:userId", clearUserNotifications);
// router.post('/send-push', sendPushNotification);
router.post('/notifications/send', sendPushNotification);


module.exports = router;
