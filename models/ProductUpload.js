const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    url: { type: String, required: true }
  },
  { _id: false } // Prevents Mongoose from adding _id inside map value
);

const productSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  about: { type: String },
  dimensions: [String],
  quantity: { type: Number, default: 0 },
  pricePerPiece: { type: Number, required: true },
  totalPiecesPerBox: { type: Number, required: true },
  mrpPerBox: { type: Number, required: true },
  discountPercentage: { type: Number, default: 0 },
  finalPricePerBox: { type: Number, required: true },
  images: [
    {
      id: { type: String, required: true },
      url: { type: String, required: true }
    }
  ],
  colorImageMap: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// 👇 This sets the collection name explicitly to `productuploads`
module.exports = mongoose.model('ProductUpload', productSchema, 'productuploads');
