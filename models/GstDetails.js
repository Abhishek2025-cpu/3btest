const mongoose = require('mongoose');

const gstDetailsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
  gstin: { type: String, required: true, unique: true },
  legalName: { type: String },
  tradeName: { type: String },
  state: { type: String },
  verifiedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GstDetails', gstDetailsSchema);
