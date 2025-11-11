const express = require("express");
const router = express.Router();
const { registerUserToken, sendGlobalNotification } = require("../services/notificationService");

// POST /api/notifications/global
// Body: { userId, fcmToken, title, body, data }
router.post("/global", async (req, res) => {
  try {
    console.log("📥 Received POST /global notification request");
    console.log("Request body:", req.body);

    const { userId, fcmToken, title, body, data } = req.body;

    if (!userId || !fcmToken || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "userId, fcmToken, title, and body are required"
      });
    }

    // 1️⃣ Save FCM token for this user
    await registerUserToken(userId, fcmToken);

    // 2️⃣ Send global notification to all users individually
    await sendGlobalNotification(title, body, data);

    res.status(200).json({
      success: true,
      message: "Global notification sent successfully"
    });

  } catch (err) {
    console.error("❌ Error sending global notification:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
