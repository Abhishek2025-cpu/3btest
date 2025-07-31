const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderModel: { type: String, required: true, enum: ['User', 'Admin'] },

  receiverId: { type: mongoose.Schema.Types.ObjectId, required: true },
  receiverModel: { type: String, required: true, enum: ['User', 'Admin'] },

  message: { type: String, default: null },
  
  // --- THIS IS THE FIX ---
  // Change mediaUrl from String to an Object that holds the id and url
  mediaUrl: { 
    id: { type: String },
    url: { type: String }
  },
  // -----------------------

  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});

// Set default to null for the mediaUrl object if it's not provided
chatSchema.path('mediaUrl').default(null);

module.exports = mongoose.model('Chat', chatSchema);