const Notification = require("../models/Notification");
const admin = require('firebase-admin');
const User = require('../models/User');

// ✅ Safe Firebase initialization
// const serviceAccount = require('../bprofiles-54714-firebase-adminsdk-fbsvc-035dca421e.json');
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
//   });
// }

const path = require('path');


const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_BOOKS;
if (!serviceAccountPath) {
  throw new Error("❌ Missing FIREBASE_SERVICE_ACCOUNT_BOOKS env var");
}

const serviceAccount = require(path.resolve(serviceAccountPath));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
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
      return res.status(400).json({ message: 'Missing required fields: fcmToken, userId, message.title, or message.body' });
    }

    // Validate userId exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Construct the Firebase message
    const firebaseMessage = {
      notification: {
        title: message.title,
        body: message.body,
      },
      data: message.data || {},
      token: fcmToken,
    };

    // Send notification via FCM
    const messageId = await admin.messaging().send(firebaseMessage);

    // Save notification to DB (fixed for schema)
    const newNotification = new Notification({
      userId,
      fcmTokens: [fcmToken],
      title: message.title,
      body: message.body,
      data: message.data || {}
    });
    await newNotification.save();

    res.status(200).json({
      message: '✅ Notification sent successfully and saved to DB',
      messageId
    });
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    res.status(500).json({
      message: '❌ Failed to send push notification',
      error: error.message
    });
  }
};


