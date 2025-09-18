const Notification = require("../models/Notification");
const admin = require('firebase-admin');
const User = require('../models/User');
const path = require("path");
const { uploadBufferToGCS } = require("../utils/gcloud");

// ✅ Safe Firebase initialization


const serviceAccountPath = path.join(__dirname, "../bprofiles-54714-firebase-adminsdk-fbsvc-5ae26f5109.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });
}




// Messaging service
const messagingService = admin.messaging();
console.log('Result of admin.messaging():', messagingService);
console.log('Does messagingService have sendToDevice method?', typeof messagingService.sendToDevice);
// Should be 'function'

// GET /notifications/:userId
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "✅ Notifications fetched successfully",
      count: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      message: "❌ Failed to fetch notifications",
      error: error.message
    });
  }
};

// DELETE /notifications/:userId
exports.clearUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const result = await Notification.deleteMany({ userId });

    return res.status(200).json({
      success: true,
      message: `✅ ${result.deletedCount} notifications deleted`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return res.status(500).json({
      success: false,
      message: '❌ Failed to clear notifications',
      error: error.message
    });
  }
};

// POST /notifications/send
exports.sendPushNotification = async (req, res) => {
  try {
    const { fcmToken, userId, message } = req.body;

    if (!fcmToken || !userId || !message || !message.title || !message.body) {
      return res.status(400).json({
        message:
          "Missing required fields: fcmToken, userId, message.title, or message.body",
      });
    }

    // Validate userId exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Normalize fcmToken (can be a single string or array of tokens)
    const tokens = Array.isArray(fcmToken) ? fcmToken : [fcmToken];

    // Build Firebase message
    const firebaseMessage = {
      notification: {
        title: message.title,
        body: message.body,
      },
      data: message.data || {},
      tokens, // notice plural
    };

    // Send notification(s) via FCM
    const response = await admin.messaging().sendEachForMulticast(firebaseMessage);

    // Log per-token results
    response.responses.forEach((resp, idx) => {
      if (resp.success) {
        console.log(`✅ Sent to token[${idx}]:`, tokens[idx]);
      } else {
        console.error(
          `❌ Failed for token[${idx}]: ${tokens[idx]}`,
          JSON.stringify(resp.error, null, 2)
        );
      }
    });

    // If at least one success, save notification to DB
    if (response.successCount > 0) {
      const newNotification = new Notification({
        userId,
        fcmTokens: tokens,
        title: message.title,
        body: message.body,
        data: message.data || {},
      });
      await newNotification.save();
    }

    res.status(200).json({
      message: "🔔 Push notification attempt finished",
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error("❌ Error in sendPushNotification:", error);
    res.status(500).json({
      message: "❌ Failed to send push notification",
      error: error.message,
    });
  }
};




exports.sendAdminPushNotification = async (req, res) => {
  try {
    const { title, body } = req.body;
    let imageUrl = null;

    if (!title || !body) {
      return res.status(400).json({
        message: "Missing required fields: title or body",
      });
    }

    // ✅ If image uploaded, push to GCS
    if (req.file) {
      const uploaded = await uploadBufferToGCS(
        req.file.buffer,
        req.file.originalname,
        "admin-notifications", // folder in GCS
        req.file.mimetype
      );
      imageUrl = uploaded.url;
    }

    // 1️⃣ Collect all user tokens
    const users = await User.find({ fcmToken: { $exists: true, $ne: null } });
    const tokens = users
      .map((u) => (Array.isArray(u.fcmToken) ? u.fcmToken : [u.fcmToken]))
      .flat()
      .filter(Boolean);

    if (!tokens.length) {
      return res.status(404).json({ message: "No FCM tokens found" });
    }

    // 2️⃣ Build Firebase message
    const firebaseMessage = {
      notification: {
        title,
        body,
        image: imageUrl || undefined, // attach uploaded image
      },
      data: {
        type: "admin_broadcast",
        campaign: "latestDeals",
      },
      tokens,
    };

    // 3️⃣ Send notifications
    const response = await admin.messaging().sendEachForMulticast(firebaseMessage);

    // 4️⃣ Log failures for debugging
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`❌ Failed for token[${idx}]: ${tokens[idx]}`, resp.error);
      }
    });

    // 5️⃣ Save broadcast record in DB
    const newNotification = new Notification({
      userId: null,
      fcmTokens: tokens,
      title,
      body,
      image: imageUrl || null,
      data: { type: "admin_broadcast", campaign: "latestDeals" },
    });
    await newNotification.save();

    res.status(200).json({
      message: "📢 Admin push notification attempt finished",
      successCount: response.successCount,
      failureCount: response.failureCount,
      imageUrl,
    });
  } catch (error) {
    console.error("❌ Error in sendAdminPushNotification:", error);
    res.status(500).json({
      message: "❌ Failed to send admin push notification",
      error: error.message,
    });
  }
};