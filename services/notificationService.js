const { messaging } = require("../firebase"); // ✅ destructure messaging
const Notification = require("../models/Notification");

exports.sendNotification = async (userId, tokens, title, body, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.log("⚠️ No FCM tokens provided, skipping notification");
      return null;
    }

    const message = {
      tokens,
      notification: { title, body },
      data,
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
    };

    // ✅ Correct usage
    const response = await messaging.sendMulticast(message);

    await Notification.create({ userId, title, body, data });

    console.log("✅ Notification sent & saved", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};

