const mongoose = require('mongoose');

const archiveSchema = new mongoose.Schema({
  originalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  deletedUserData: {
    type: Object,
    required: true,
  },
  deletedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Archive', archiveSchema);
