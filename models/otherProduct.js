// models/otherProduct.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

// This sub-schema now includes an image for the material itself
const MaterialSchema = new Schema({
  materialName: {
    type: String,
    required: [true, 'Material name is required.'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price for the material is required.'],
    min: [0, 'Price cannot be negative.']
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
  // Main product images
  images: [{
    id: { type: String, required: true },
    url: { type: String, required: true }
  }],
  // Array of materials, each with its own name, price, and image
  materials: {
    type: [MaterialSchema],
    required: true,
    validate: [val => val.length > 0, 'At least one material is required.']
  },
  // Other fields
  size: { type: String, trim: true },
  details: { type: String, required: [true, 'Product details are required.'] },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'OtherCategory',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OtherProduct', otherProductSchema);