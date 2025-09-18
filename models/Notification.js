const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Make userId optional for admin broadcasts
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },

    fcmTokens: { type: [String], default: [] }, // ✅ supports multiple tokens

    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Object, default: {} },

    image: { type: String }, // optional field for admin image

    isRead: { type: Boolean, default: false }, // optional: for marking later
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
