const Notification = require("../models/Notification");
const admin = require('firebase-admin');
const User = require('../models/User');

// GET /notifications/:userId
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 });

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



const serviceAccount = require('../bprofiles-54714-firebase-adminsdk-fbsvc-035dca421e.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

exports.sendPushNotification = async (req, res) => {
  try {
    const { fcmToken, userId, message } = req.body;

    if (!fcmToken || !userId || !message || !message.title || !message.body) {
      return res.status(400).json({ message: 'Missing required fields: fcmToken, userId, message.title, or message.body' });
    }

    // Optional: Validate userId exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const payload = {
      notification: {
        title: message.title,
        body: message.body,
      },
      data: message.data || {} // Optional data for the client
    };

    const options = {
      priority: 'high',
      timeToLive: 60 * 60 * 24 // 1 day
    };

    await admin.messaging().sendToDevice(fcmToken, payload, options);

    // Save notification details to your database
    const newNotification = new Notification({
      userId,
      fcmToken,
      message: {
        title: message.title,
        body: message.body,
        data: message.data
      }
    });
    await newNotification.save();

    res.status(200).json({ message: 'Notification sent successfully and saved to DB' });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ message: 'Failed to send push notification', error: error.message });
  }
};


