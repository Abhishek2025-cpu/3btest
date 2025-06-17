// models/Otp.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // expires in 5 min
});

module.exports = mongoose.model('Otp', otpSchema);
