const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    fcmTokens: { type: [String], default: [] }, // ✅ supports multiple tokens

    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Object, default: {} },

    isRead: { type: Boolean, default: false }, // optional: for marking later
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
