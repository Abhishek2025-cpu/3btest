const { messaging } = require('../firebase'); // your initialized Firebase admin
const Notification = require('../models/Notification');

exports.sendPushNotification = async (req, res) => {
  try {
    const { userId, tokens, title, body, data = {} } = req.body;

    if (!tokens || !tokens.length) {
      return res.status(400).json({ success: false, message: 'No FCM tokens provided' });
    }

    // Normalize tokens
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];

    // FCM message payload
    const message = {
      tokens: tokenArray,
      notification: { title, body }, // mandatory for background/killed
      data, // optional key/value pairs
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel', // must match React Native channel
          sound: 'default',
        },
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
          },
        },
      },
    };

    // Send notifications
    const response = await messaging.sendEachForMulticast(message);

    // Save in DB
    await Notification.create({ userId, title, body, data });

    return res.status(200).json({
      success: true,
      message: 'Push notification sent successfully',
      response,
    });
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending push notification',
      error: error.message,
    });
  }
};
