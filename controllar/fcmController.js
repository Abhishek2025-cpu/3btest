const User = require('../models/User'); // adjust path

// POST - Add new FCM token
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

    // Avoid duplicate tokens
    if (!user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
      await user.save();
    }

    return res.status(200).json({ message: "FCM token saved successfully", user });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// PUT - Update (replace) a token
exports.updateFcmToken = async (req, res) => {
  try {
    const { _id, oldToken, newToken } = req.body;

    if (!_id || !oldToken || !newToken) {
      return res.status(400).json({ message: "User _id, oldToken, and newToken are required" });
    }

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const index = user.fcmTokens.indexOf(oldToken);
    if (index === -1) {
      return res.status(404).json({ message: "Old FCM token not found for this user" });
    }

    user.fcmTokens[index] = newToken;
    await user.save();

    return res.status(200).json({ message: "FCM token updated successfully", user });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

