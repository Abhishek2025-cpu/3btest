const { messaging } = require("../firebase");
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

    // ✅ Use sendEachForMulticast (newer SDKs)
    const response = await messaging.sendEachForMulticast(message);

    await Notification.create({ userId, title, body, data });

    console.log("✅ Notification sent & saved", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};
