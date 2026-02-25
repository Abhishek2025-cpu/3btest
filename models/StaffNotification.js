const mongoose = require('mongoose');

const staffNotificationSchema = new mongoose.Schema({
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true,
    index: true // Added index for faster fetching
  },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StaffNotification', staffNotificationSchema);