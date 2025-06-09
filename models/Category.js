const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  categoryId: { type: String, required: true, unique: true },
  name: String,
  inStock: { type: Boolean, default: true },
  images: [
    {
      url: String,
      public_id: String,
    }
  ],
  position: {
    type: Number,
    default: null,
  }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
