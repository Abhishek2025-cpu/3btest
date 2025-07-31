const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderModel: { type: String, required: true, enum: ['User', 'Admin'] },

  receiverId: { type: mongoose.Schema.Types.ObjectId, required: true },
  receiverModel: { type: String, required: true, enum: ['User', 'Admin'] },

  message: { type: String, default: null },
  
  // This is the correct way to define an optional nested object.
  // Mongoose will simply not include this field if it's not provided.
  mediaUrl: { 
    id: { type: String },
    url: { type: String }
  },

  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});

// REMOVE THIS LINE: chatSchema.path('mediaUrl').default(null);

module.exports = mongoose.model('Chat', chatSchema);