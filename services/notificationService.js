const { messaging } = require("../firebase");  // uses your initializer
const Notification = require("../models/Notification"); // optional: save logs in DB

/**
 * Send push notification to one device token
 *
 * @param {string} userId - User ID (optional, if you want to save in DB)
 * @param {string} targetToken - Device FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} image - (optional) Image URL for notification
 */
async function sendNotification(userId, targetToken, title, body, image = null) {
  try {
    const message = {
      token: targetToken,
      notification: {
        title,
        body,
        image,
      },
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
          aps: {
            sound: "default",
          },
        },
      },
    };

    const response = await messaging.send(message);

    // (Optional) Save notification in DB
    if (userId) {
      await Notification.create({ userId, title, body, image });
    }

    console.log("✅ Successfully sent message:", response);
    return true;
  } catch (err) {
    console.error("❌ Error sending notification:", err.message);
    return false;
  }
}

module.exports = { sendNotification };
