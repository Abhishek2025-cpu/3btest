const { messaging } = require("../firebase");
const Notification = require("../models/Notification");

exports.sendNotification = async (userId, tokens, title, body, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.log("⚠️ No FCM tokens provided, skipping notification");
      return null;
    }

    const message = {
      tokens, // ✅ use tokens array
      notification: { title, body },
      data,
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    };

    // ✅ Correct multicast call
    const response = await messaging.sendEachForMulticast(message);

    // Save notification in DB
    await Notification.create({ userId, title, body, data });

    console.log("✅ Notification sent & saved", response.successCount, "success,", response.failureCount, "failed");
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};
