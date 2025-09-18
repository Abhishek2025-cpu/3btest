const Notification = require("../models/Notification");
const User = require('../models/User');
const cloudinary = require("../utils/cloudinary");
const { initFirebase } = require("../firebase");

// Always grab fresh Firebase instance
const { messaging } = initFirebase();

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

// ========== SEND USER NOTIFICATION ==========
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

    const response = await messaging.sendEachForMulticast(firebaseMessage);

    // Save if successful
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

    // ✅ If an image is uploaded, push it to Cloudinary
    if (req.file) {
      const uploaded = await cloudinary.uploader.upload_stream(
        { folder: 'admin-notifications' },
        (error, result) => {
          if (error) throw error;
          return result;
        }
      ).end(req.file.buffer);

      imageUrl = uploaded.secure_url;
    }

    // ...rest of your code to send FCM notifications
  } catch (error) {
    console.error("❌ Error in sendAdminPushNotification:", error);
    res.status(500).json({
      message: "❌ Failed to send admin push notification",
      error: error.message,
    });
  }
};
