const mongoose = require('mongoose');

const productUploadSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  about: { type: String },
  colors: [String],
  dimensions: [String],
  quantity: { type: Number, default: 0 },
  pricePerPiece: { type: Number, required: true },
  totalPiecesPerBox: { type: Number, required: true },
  mrpPerBox: { type: Number }, // calculated: pricePerPiece * totalPiecesPerBox
  images: [String],
  discountPercentage: { type: Number, default: 0 },
finalPricePerBox: { type: Number }

}, { timestamps: true });

module.exports = mongoose.model('ProductUpload', productUploadSchema);
