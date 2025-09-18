const express = require("express");
const router = express.Router();
const { uploadProduct } = require('../middleware/Multer');
const { getUserNotifications,clearUserNotifications,sendPushNotification ,sendAdminPushNotification} = require("../controllar/notificationController");
// const { sendPushNotification } = require('../controllar/pushNotificationController');


router.get("/notifications/:userId", getUserNotifications);
router.delete("/notifications/clear/:userId", clearUserNotifications);
// router.post('/send-push', sendPushNotification);
router.post('/notifications/send', sendPushNotification);
router.post(
  "/notifications/admin/send",
  uploadProduct, // Single image field named "image"
 sendAdminPushNotification
);


module.exports = router;
