const mongoose = require('mongoose');

const imageSubSchema = new mongoose.Schema({
  url: { type: String, required: true },
  id: { type: String, required: true } // This is the file path in GCS
  // Mongoose automatically adds the `_id` field to this sub-schema
});

const categorySchema = new mongoose.Schema({
  categoryId: { type: String, required: true, unique: true },
  name: String,
  inStock: { type: Boolean, default: true },
  images: [imageSubSchema], // Use the defined sub-schema
  position: {
    type: Number,
    default: null,
  }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);