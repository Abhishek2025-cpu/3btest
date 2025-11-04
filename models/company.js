const mongoose = require('mongoose');
const { Schema } = mongoose;

const companySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required.'],
      unique: true,
      trim: true,
    },
    logo: {
      id: { type: String, required: true }, // GCS object path/ID
      url: { type: String, required: true }, // Public URL for the logo
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'OtherCategory', // Must match the model name for OtherCategory
      required: [true, 'A category is required for the company.'],
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Prevent OverwriteModelError on re-import
module.exports = mongoose.models.Company || mongoose.model('Company', companySchema);
