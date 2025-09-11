// services/notificationService.js
const admin = require('../firebase'); // your initialized Firebase admin
const Notification = require('../models/Notification');

/**
 * Send push notification to device(s)
 * @param {String} userId - ID of the user to send notification
 * @param {Array<string>} tokens - Array of FCM tokens
 * @param {String} title - Notification title
 * @param {String} body - Notification body
 * @param {Object} data - Optional extra data (e.g., orderId, chatId)
 */
exports.sendNotification = async (userId, tokens, title, body, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.log('⚠️ No FCM tokens provided, skipping notification');
      return null;
    }

    const message = {
      tokens,
      notification: {
        title,
        body
      },
      data,              // optional key/value data payload
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default', // make sure you have a channel in Android
        }
      },
      apns: {
        headers: {
          'apns-priority': '10', // high priority for iOS
        },
        payload: {
          aps: {
            sound: 'default',
            alert: {
              title,
              body
            },
            badge: 1
          }
        }
      }
    };

    // Send notification to multiple tokens
    const response = await admin.messaging().sendEachForMulticast(message);

    // ✅ Save notification in DB
    await Notification.create({
      userId,
      title,
      body,
      data
    });

    console.log('✅ Notification sent & saved', response);
    return response;
  } catch (err) {
    console.error('❌ Error sending notification:', err);
    throw err;
  }
};
