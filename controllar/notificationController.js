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
