// controllers/notificationController.js
const Notification = require("../models/Notification");
const admin = require('../firebase'); // Firebase Admin SDK instance
const User = require('../models/User');
const cloudinary = require("../utils/cloudinary");

// ========== GET USER NOTIFICATIONS ==========
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

// ========== CLEAR USER NOTIFICATIONS ==========
exports.clearUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const result = await Notification.deleteMany({ userId });
    return res.status(200).json({
      success: true,
      message: `✅ ${result.deletedCount} notifications deleted`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "❌ Failed to clear notifications",
      error: error.message
    });
  }
};

// ========== SEND USER PUSH NOTIFICATION ==========
exports.sendPushNotification = async (req, res) => {
  try {
    const { fcmToken, userId, message } = req.body;

    if (!fcmToken || !userId || !message?.title || !message?.body) {
      return res.status(400).json({
        message: "Missing required fields: fcmToken, userId, message.title, or message.body",
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const tokens = Array.isArray(fcmToken) ? fcmToken : [fcmToken];

    const firebaseMessage = {
      notification: { title: message.title, body: message.body },
      data: message.data || {},
      tokens,
    };

    const response = await admin.messaging().sendMulticast(firebaseMessage);

    // Save notification if at least one token succeeded
    if (response.successCount > 0) {
      await Notification.create({
        userId,
        fcmTokens: tokens,
        title: message.title,
        body: message.body,
        data: message.data || {},
      });
    }

    res.status(200).json({
      message: "🔔 Push notification attempt finished",
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "❌ Failed to send push notification",
      error: error.message,
    });
  }
};

// ========== SEND ADMIN BROADCAST ==========
exports.sendAdminPushNotification = async (req, res) => {
  try {
    const { title, body } = req.body;
    let imageUrl = null;

    if (!title || !body) {
      return res.status(400).json({ message: "Missing required fields: title or body" });
    }

    // Upload image to Cloudinary if provided
    if (req.file) {
      const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'admin-notifications' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = uploaded.secure_url;
    }

    // Collect all FCM tokens from users
    const users = await User.find({ fcmTokens: { $exists: true, $ne: [] } });
    const tokens = users
      .map(u => u.fcmTokens)
      .flat()
      .filter(Boolean);

    if (!tokens.length) {
      return res.status(404).json({ message: "No FCM tokens found" });
    }

    const firebaseMessage = {
      notification: {
        title,
        body,
        image: imageUrl || undefined,
      },
      data: {
        type: "admin_broadcast",
        campaign: "latestDeals",
      },
      tokens,
    };

    const response = await admin.messaging().sendMulticast(firebaseMessage);

    // Log failed tokens
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`❌ Failed for token[${idx}]: ${tokens[idx]}`, resp.error);
      }
    });

    // Save broadcast record in DB
    await Notification.create({
      userId: null,
      fcmTokens: tokens,
      title,
      body,
      image: imageUrl || null,
      data: { type: "admin_broadcast", campaign: "latestDeals" },
    });

    res.status(200).json({
      message: "📢 Admin push notification sent successfully",
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
