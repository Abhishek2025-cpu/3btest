const express = require("express");
const router = express.Router();
const { getUserNotifications } = require("../controllar/notificationController");

router.get("/notifications/:userId", getUserNotifications);

module.exports = router;
