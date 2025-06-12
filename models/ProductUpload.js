const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Category'
  },
  name: { type: String, required: true },
  about: { type: String },
  dimensions: [String],
  quantity: { type: Number, default: 0 },
  pricePerPiece: { type: Number, required: true },
  totalPiecesPerBox: { type: Number, required: true },
  mrpPerBox: { type: Number },
  discountPercentage: { type: Number, default: 0 },
  finalPricePerBox: { type: Number },
  images: [
    {
      id: { type: String, required: true },
      url: { type: String, required: true }
    }
  ],
  colorImageMap: {
    type: Map,
    of: {
      id: String,
      url: String
    },
    default: () => new Map()
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
