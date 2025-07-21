// models/otherProduct.model.js

const mongoose = require('mongoose');
const { Schema, model, Types } = require('mongoose');

// This sub-schema is updated to include discount fields
const MaterialSchema = new Schema({
  materialName: {
    type: String,
    required: [true, 'Material name is required.'],
    trim: true
  },
  // This is now the original price (MRP) before any discounts
  price: {
    type: Number,
    required: [true, 'Original price for the material is required.'],
    min: [0, 'Price cannot be negative.']
  },
  // The discount percentage (e.g., 15 for 15% off)
  discount: {
    type: Number,
    required: true, // It's required, but will default to 0 if not provided
    default: 0,
    min: [0, 'Discount cannot be negative.'],
    max: [100, 'Discount cannot exceed 100%.']
  },
  // The final price after the discount is applied. This is calculated in the controller.
  discountedPrice: {
    type: Number,
    required: [true, 'Discounted price is required.'],
    min: [0, 'Discounted price cannot be negative.']
  },
  materialImage: {
    id: { type: String, required: true }, // The GCS object ID/name
    url: { type: String, required: true }  // The public URL for the image
  }
}, { _id: false });



const otherProductSchema = new Schema({
  productName: {
    type: String,
    required: [true, 'Product name is required.'],
    trim: true,
  },
  modelNo: {
    type: String,
    required: [true, 'Model number is required.'],
    trim: true,
  },
  images: [{
    id: { type: String, required: true },
    url: { type: String, required: true }
  }],
  materials: {
    type: [MaterialSchema],
    required: true,
    validate: [val => val.length > 0, 'At least one material is required.']
  },
  companies: [{
    type: Schema.Types.ObjectId,
    ref: 'Company'
  }],
  size: { type: String, trim: true },
  details: { type: String, required: [true, 'Product details are required.'] },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'OtherCategory',
    required: true,
    index: true
  },

  // ✅ New Field: pieces
  pieces: {
    type: Schema.Types.Mixed,
    default: 'NA'
  }

}, { timestamps: true });


module.exports = mongoose.model('OtherProduct', otherProductSchema);