const messaging = require("../firebase");

/**
 * Send push notification
 */
exports.sendNotification = async (tokens, title, body, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.log("⚠️ No FCM tokens provided, skipping notification");
      return null;
    }

    const payload = {
      notification: { title, body },
      data
    };

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data
    });

    console.log("✅ Notification sent", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};
