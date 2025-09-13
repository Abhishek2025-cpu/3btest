const { messaging } = require("../firebase");
const Notification = require("../models/Notification");

exports.sendNotification = async (userId, tokens, title, body, data = {}) => {
  try {
    // Normalize to array
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];

    if (tokenArray.length === 0) {
      console.log("⚠️ No FCM tokens provided, skipping notification");
      return null;
    }

    const message = {
      tokens: tokenArray,
      notification: { title, body },
      data,
      android: {
        priority: "high",
        notification: {
          channelId: "high_importance_channel",
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

    console.log(
      "✅ Notification sent & saved",
      response.successCount,
      "success,",
      response.failureCount,
      "failed"
    );
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};
