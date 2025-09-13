const { messaging } = require('../firebase');
const Notification = require('../models/Notification');

/**
 * Send push notification to a user
 * Request body: { userId, title, body, data, tokens }
 */
exports.sendPushNotification = async (req, res) => {
  try {
    const { userId, title, body, data = {}, tokens } = req.body;

    if (!tokens || !tokens.length) {
      return res.status(400).json({ success: false, message: 'No FCM tokens provided' });
    }

    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];

    // Construct message for background/killed
    const message = {
      tokens: tokenArray,
      notification: { title, body },
      android: {
        priority: "high",
        notification: {
          channelId: "high_importance_channel",
          sound: "default",
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            alert: { title, body },
            sound: "default",
            "content-available": 1, // ensures iOS shows notification in background/killed
          },
        },
      },
      data, // optional custom data for deep linking
    };

    // Send multicast
    const response = await messaging.sendMulticast(message);

    // Save in DB
    await Notification.create({ userId, title, body, data });

    return res.status(200).json({
      success: true,
      message: 'Push notification sent successfully',
      response: {
        successCount: response.successCount,
        failureCount: response.failureCount,
      },
    });
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
    return res.status(500).json({
      success: false,
      message: 'Server error sending push notification',
      error: error.message,
    });
  }
};
