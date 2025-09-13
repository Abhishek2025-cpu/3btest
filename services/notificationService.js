const { messaging } = require('../firebase');
const Notification = require('../models/Notification');

exports.sendNotification = async (userId, tokens, title, body, data = {}) => {
  try {
    // Ensure tokens is an array
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    if (!tokenArray.length) {
      console.log("⚠️ No FCM tokens provided, skipping notification");
      return null;
    }

    // ✅ Payload for both foreground and background/killed notifications
    const message = {
      tokens: tokenArray,
      notification: {
        title,
        body,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "high_importance_channel", // must match RN channel
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK", // works for Android background
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            alert: { title, body },
            sound: "default",
            "content-available": 1, // ensures iOS shows notification in background/killed
          },
          ...data,
        },
      },
      data, // optional custom data
    };

    // 🔥 Modern method for sending to multiple tokens
    const response = await messaging.sendMulticast(message);

    // Save notification in DB
    await Notification.create({ userId, title, body, data });

    console.log(
      `✅ Notification sent & saved: ${response.successCount} success, ${response.failureCount} failed`
    );

    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};
