const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: String,
  number: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePhoto: String,
  email: { type: String, required: true, unique: true },
  token: {
  type: String,
  default: null
},

  otp: String,
  otpExpiry: Date
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);

