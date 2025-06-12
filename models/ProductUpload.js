const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  url: { type: String, required: true }
}, { _id: false });

const productUploadSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  about: { type: String },
  dimensions: [String],
  quantity: { type: Number, default: 0 },
  pricePerPiece: { type: Number, required: true },
  totalPiecesPerBox: { type: Number, required: true },
  mrpPerBox: { type: Number },
  discountPercentage: { type: Number, default: 0 },
  finalPricePerBox: { type: Number },

  // 🔹 All uploaded images (with ID + URL)
  images: [imageSchema],

  // 🔹 Color images as subset of above, keyed by original filename
  colorImageMap: {
    type: Map,
    of: imageSchema,
    default: {}
  }

}, { timestamps: true });

module.exports = mongoose.model('ProductUpload', productUploadSchema);
