const admin = require("../firebase");
const Notification = require("../models/Notification");
const User = require("../models/User");

async function sendNotification(userId, tokens, title, body, data = {}) {
  try {
    console.log("DEBUG PARAMS:");
    console.log("userId:", userId);
    console.log("tokens:", tokens);
    console.log("title:", title);
    console.log("body:", body);

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      console.log("⚠️ No valid tokens provided");
      return;
    }

    for (const token of tokens) {
      try {
        await admin.messaging().send({
          token,
          notification: {
            title: String(title),
            body: String(body),
          },
          data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ),
        });
      } catch (err) {
        console.warn("❌ FCM send failed:", err.message);
      }
    }

    await Notification.create({
      userId,
      fcmTokens: tokens,
      title: String(title),
      body: String(body),
      data
    });

    console.log("✅ Notification saved successfully");

  } catch (err) {
    console.error("❌ sendNotification error:", err);
    throw err;
  }
}




/**
 * Register a user's FCM token
 */
async function registerUserToken(userId, fcmToken) {
  try {
    console.log(`💾 Registering FCM token for userId: ${userId}`);
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { fcmTokens: fcmToken } },
      { new: true, upsert: true }
    );
    console.log("✅ FCM token registered successfully");
  } catch (err) {
    console.error("❌ Error registering FCM token:", err.message);
  }
}

/**
 * Send global notification to all users individually
 */
async function sendGlobalNotification(title, body, data = {}) {
  try {
    const users = await User.find({ fcmTokens: { $exists: true, $ne: [] } });
    const tokens = users.map(u => u.fcmTokens).flat().filter(Boolean);

    if (!tokens.length) {
      console.log("⚠️ No FCM tokens found. Skipping notification.");
      return;
    }

    console.log(`📢 Sending global notification "${title}" to ${tokens.length} tokens individually`);

    for (const token of tokens) {
      try {
        await admin.messaging().send({
          token,
          notification: { title, body },
          data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, v.toString()])
          ),
        });
      } catch (err) {
        console.warn(`❌ Failed to send to token: ${token}, Error: ${err.message}`);
      }
    }

    await Notification.create({ userId: null, fcmTokens: tokens, title, body, data });
    console.log("💾 Global notification saved in DB");

  } catch (err) {
    console.error("❌ Error sending global notification:", err.message);
    throw err;
  }
}

module.exports = { registerUserToken, sendGlobalNotification,sendNotification };
