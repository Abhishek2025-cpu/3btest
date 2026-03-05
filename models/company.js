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
      id: {
        type: String,
        required: true, // GCS object path / ID
      },
      url: {
        type: String,
        required: true, // Public URL
      },
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Prevent OverwriteModelError on re-import
module.exports =
  mongoose.models.Company || mongoose.model('Company', companySchema);
