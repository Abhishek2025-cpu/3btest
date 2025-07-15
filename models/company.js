// models/company.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const companySchema = new Schema({
  name: {
    type: String,
    required: [true, 'Company name is required.'],
    unique: true, // Prevent duplicate company names
    trim: true,
  },
  logo: {
    id: { type: String, required: true }, // GCS object ID
    url: { type: String, required: true }  // Public URL for the logo
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);