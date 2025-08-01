// models/company.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const companySchema = new Schema({
  name: {
    type: String,
    required: [true, 'Company name is required.'],
    unique: true,
    trim: true,
  },
  logo: {
    id: { type: String, required: true }, // GCS object path/ID
    url: { type: String, required: true }  // Public URL for the logo
  },
  // --- NEW FIELD ---
  // Add a reference to the category this company belongs to.
  category: {
    type: Schema.Types.ObjectId,
    ref: 'OtherCategory', // This string MUST match the model name from mongoose.model()
    required: [true, 'A category is required for the company.']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);