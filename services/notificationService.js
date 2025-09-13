const { messaging } = require('../firebase');
const Notification = require('../models/Notification');

exports.sendNotification = async (userId, tokens, title, body, data = {}) => {
  try {
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];

    if (!tokenArray.length) return null;

    const message = {
      tokens: tokenArray,
      notification: { title, body }, // 🔑 Mandatory for background/killed
      data, // optional
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel',
          sound: 'default',
        },
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: {
          aps: { alert: { title, body }, sound: 'default' },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    await Notification.create({ userId, title, body, data });

    console.log(
      '✅ Notification sent & saved',
      response.successCount,
      'success,',
      response.failureCount,
      'failed'
    );
    return response;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    throw error;
  }
};
