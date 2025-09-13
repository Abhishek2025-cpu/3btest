const { messaging } = require('../firebase'); // your initialized Firebase admin
const Notification = require('../models/Notification');

exports.sendPushNotification = async (req, res) => {
  console.log('🔔 /send-push hit with body:', req.body);

  try {
    const { userId, tokens, title, body, data = {} } = req.body;

    if (!tokens || !tokens.length) {
      console.log('⚠️ No tokens provided');
      return res.status(400).json({ success: false, message: 'No FCM tokens provided' });
    }

    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    console.log('✅ Tokens to send:', tokenArray);

    const message = {
      tokens: tokenArray,
      notification: { title, body },
      data,
      android: { priority: 'high', notification: { channelId: 'high_importance_channel', sound: 'default' } },
      apns: { headers: { 'apns-priority': '10' }, payload: { aps: { alert: { title, body }, sound: 'default' } } },
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log('✅ FCM response:', response);
    console.log('✅ FCM multicast response:', JSON.stringify(response, null, 2));


    await Notification.create({ userId, title, body, data });
    console.log('✅ Notification saved to DB');

    res.status(200).json({ success: true, message: 'Push notification sent successfully', response });
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    res.status(500).json({ success: false, message: 'Error sending push notification', error: error.message });
  }
};

