exports.sendNotification = async (userId, tokens, title, body, data = {}) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.log("⚠️ No FCM tokens provided, skipping notification");
      return null;
    }

    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK", // important for background
        ...data,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "high_importance_channel", // create this channel on client
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            contentAvailable: true,
          },
        },
        headers: {
          "apns-priority": "10",
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    await Notification.create({ userId, title, body, data });

    console.log("✅ Notification sent & saved", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};
