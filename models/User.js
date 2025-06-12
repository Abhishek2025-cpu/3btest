const mongoose = require('mongoose');

const shippingAddressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  addressType: { type: String, enum: ['Home', 'Work', 'Custom'], required: true },
  detailedAddress: { type: String, required: true }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, default: "client" },
  profileImage: { type: String, default: null },
  shippingAddresses: {
    type: [shippingAddressSchema],
    validate: [arr => arr.length <= 5, '{PATH} exceeds the limit of 5']
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
