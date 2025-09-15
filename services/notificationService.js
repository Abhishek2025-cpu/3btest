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

    // Build the message (no tokens here)
    const message = {
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

    // ✅ Correct usage with tokens passed separately
    const response = await messaging.sendEachForMulticast({
      tokens: tokenArray,
      ...message,
    });

    // Save notification in DB
    await Notification.create({ userId, title, body, data });

    console.log(
      "✅ Notification sent & saved:",
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
