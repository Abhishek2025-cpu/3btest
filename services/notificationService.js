const admin = require("../firebase");

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

    const payload = {
      notification: { title, body },
      data
    };

    const response = await admin.messaging().sendToDevice(tokens, payload);
    console.log("✅ Notification sent", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};
