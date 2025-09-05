// models/TransportPartner.js
const mongoose = require('mongoose');

const transportPartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  number: { // Assuming this is a contact number for the partner
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const TransportPartner = mongoose.model('TransportPartner', transportPartnerSchema);

module.exports = TransportPartner;