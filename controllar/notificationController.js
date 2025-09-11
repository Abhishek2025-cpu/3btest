const Notification = require("../models/Notification");

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
