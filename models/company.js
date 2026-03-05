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
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category', // must match your Category model name
      required: true,  // optional, based on your logic
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Prevent OverwriteModelError on re-import
module.exports =
  mongoose.models.Company || mongoose.model('Company', companySchema);
