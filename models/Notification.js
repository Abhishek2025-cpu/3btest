// const mongoose = require("mongoose");

// const notificationSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   title: { type: String, required: true },
//   body: { type: String, required: true },
//   data: { type: Object, default: {} },
//   isRead: { type: Boolean, default: false } // for marking as read later
// }, { timestamps: true });

// module.exports = mongoose.model("Notification", notificationSchema);



const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User' // Assuming you have a User model
  },
  fcmToken: {
    type: String,
    required: true
  },
  message: {
    title: {
      type: String,
      required: true
    },
    body: {
      type: String,
      required: true
    },
    data: { // Optional custom data
      type: Object
    }
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
