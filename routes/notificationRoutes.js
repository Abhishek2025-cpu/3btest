const express = require("express");
const router = express.Router();
const { upload } = require("../middleware/uploadMiddleware");
const { getUserNotifications,clearUserNotifications,sendPushNotification ,sendAdminPushNotification} = require("../controllar/notificationController");
// const { sendPushNotification } = require('../controllar/pushNotificationController');


router.get("/notifications/:userId", getUserNotifications);
router.delete("/notifications/clear/:userId", clearUserNotifications);
// router.post('/send-push', sendPushNotification);
router.post('/notifications/send', sendPushNotification);
router.post("/notifications/admin/send", upload.single("image"), sendAdminPushNotification);


module.exports = router;
