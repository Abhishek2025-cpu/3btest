const admin = require("../firebasee");

/**
 * Send push notification
 * @param {Array<string>} tokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - (optional) Additional payload
 */
exports.sendNotification = async (tokens, title, body, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.log("⚠️ No FCM tokens provided, skipping notification");
      return null;
    }

    const message = {
      notification: { title, body },
      data,
      tokens
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log("✅ Notification sent", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};
