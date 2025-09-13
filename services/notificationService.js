const { messaging } = require("../firebase");
const Notification = require("../models/Notification");

exports.sendNotification = async (userId, tokens, title, body, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.log("⚠️ No FCM tokens provided, skipping notification");
      return null;
    }

    const message = {
      tokens, // ✅ supports multiple tokens
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ), // 🔑 ensure all values are strings
      android: {
        priority: "high",
        notification: {
          channelId: "default_channel",
          sound: "default",
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: { sound: "default" },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    await Notification.create({ userId, title, body, data });

    console.log("✅ Notification sent & saved", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};
