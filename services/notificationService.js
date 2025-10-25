const admin = require("../firebase");
const Notification = require("../models/Notification");

/**
 * Send notification to a single user
 */
async function sendUserNotification(user, title, body, data = {}) {
  try {
    // Save in DB
    await Notification.create({ userId: user._id, title, body, data });

    const tokens = user.fcmTokens?.filter(Boolean);
    if (!tokens?.length) return;

    const message = {
      tokens,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.toString()])),
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log("✅ Notification sent:", {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (err) {
    console.error("❌ Error sending notification:", err.message);
  }
}

/**
 * Send global notification to multiple users
 */
async function sendGlobalNotification(users, title, body, data = {}) {
  const tokens = users.map(u => u.fcmTokens).flat().filter(Boolean);
  if (!tokens.length) return;

  const message = {
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.toString()])),
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log("📢 Global notification sent:", {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    // Save broadcast
    await Notification.create({ userId: null, fcmTokens: tokens, title, body, data });
  } catch (err) {
    console.error("❌ Error sending global notification:", err.message);
  }
}

module.exports = { sendUserNotification, sendGlobalNotification };
