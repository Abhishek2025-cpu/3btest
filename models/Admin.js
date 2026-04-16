const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: String,
  number: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  profilePhoto: String,

  token: {
    type: String,
    default: null
  },

  otp: String,
  otpExpiry: Date
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);

