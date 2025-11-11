// In your productModel.js file

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // CHANGE 1: The type is now String, to match the custom ID in the Category model.
  // We also remove the 'ref' here because the link will be virtual.
  categoryId: { type: String, required: false },
  name: { type: String, required: true },
  about: { type: String },
   description: { type: String },
  dimensions: [String],
  quantity: { type: Number, default: 0 },
  pricePerPiece: { type: Number, required: true },
  totalPiecesPerBox: { type: Number, required: true },
  mrpPerBox: { type: Number, required: true },
  discountPercentage: { type: Number, default: 0 },
  finalPricePerBox: { type: Number, required: true },
  images: [
    {
      _id: false, // Don't add _id to sub-documents in the array
      id: { type: String, required: true },
      url: { type: String, required: true }
    }
  ],
  colorImageMap: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  qrCodeUrl: { type: String }

}, { 
  timestamps: true,
  // CHANGE 2: Enable virtuals so we can see the populated data in JSON/objects.
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// CHANGE 3: Define the virtual relationship.
productSchema.virtual('category', {
  ref: 'Category',            // The model to use for populating
  localField: 'categoryId',     // Find the value of `categoryId` in this (Product) schema...
  foreignField: 'categoryId', // ...and find the document in the 'Category' model where its `categoryId` matches.
  justOne: true               // We only expect one category to match, not an array.
});

module.exports = mongoose.model('ProductUpload', productSchema, 'productuploads');