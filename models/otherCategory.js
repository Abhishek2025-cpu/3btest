const mongoose = require('mongoose');

// Reusable sub-schema for storing image information
const imageSubSchema = new mongoose.Schema({
  url: { type: String, required: true }, // Public URL from GCS
  id: { type: String, required: true }   // File path in GCS (e.g., 'other-categories/image-name.jpg')
});

const otherCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  images: [imageSubSchema] // An array of images
}, { timestamps: true });

module.exports = mongoose.model('OtherCategory', otherCategorySchema);