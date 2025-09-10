const User = require('../models/User'); // adjust path

// POST - Save FCM Token
exports.saveFcmToken = async (req, res) => {
  try {
    const { _id, fcmToken } = req.body;

    if (!_id || !fcmToken) {
      return res.status(400).json({ message: "User _id and fcmToken are required" });
    }

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.fcmToken = fcmToken;
    await user.save();

    return res.status(200).json({ message: "FCM token saved successfully", user });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// PUT - Update FCM Token
exports.updateFcmToken = async (req, res) => {
  try {
    const { _id, fcmToken } = req.body;

    if (!_id || !fcmToken) {
      return res.status(400).json({ message: "User _id and fcmToken are required" });
    }

    const user = await User.findByIdAndUpdate(
      _id,
      { fcmToken },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "FCM token updated successfully", user });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
