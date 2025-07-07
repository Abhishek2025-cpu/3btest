const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  message: { type: String, default: null },
  mediaUrl: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});

module.exports = mongoose.model('Chat', chatSchema);
