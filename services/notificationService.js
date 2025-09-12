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
      notification: {
        title,
        body
      },
      data, // optional key/value pairs
      android: {
        priority: "high",
        notification: {
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK"
        }
      },
      apns: {
        headers: {
          "apns-priority": "10"
        },
        payload: {
          aps: {
            sound: "default",
            category: "NEW_MESSAGE_CATEGORY"
          }
        }
      }
    };

    // ✅ sendEachForMulticast will handle multiple tokens
    const response = await messaging.sendEachForMulticast(message);

    // Save notification in DB
    await Notification.create({ userId, title, body, data });

    console.log("✅ Notification sent & saved", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};
