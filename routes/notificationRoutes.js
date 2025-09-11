const express = require("express");
const router = express.Router();
const { getUserNotifications,clearUserNotifications } = require("../controllar/notificationController");

router.get("/notifications/:userId", getUserNotifications);
router.delete("/notifications/clear/:userId", clearUserNotifications);


module.exports = router;
