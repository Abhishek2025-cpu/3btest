const mongoose = require('mongoose');

// This is the "subset" schema for an individual box.
const boxSchema = new mongoose.Schema({
  boxSerialNo: { type: String, required: true }, // e.g., '001', '002'
  qrCodeUrl: { type: String, required: true },   // Unique QR code URL for this box
  stockStatus: {
    type: String,
    enum: ['In Stock', 'Stock Out'],
    default: 'In Stock',
  },
}, { _id: true, timestamps: true }); // _id: true ensures each sub-document gets its own unique ID


// This is the "superset" schema for the main item.
const mainItemSchema = new mongoose.Schema({
  itemNo: { type: String, required: true, unique: true }, // Main item number should be unique
  length: { type: String, required: true },
  noOfSticks: { type: Number, required: true },
  helper: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    name: { type: String, required: true },
    eid: { type: String, required: true },
  },
  operator: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    name: { type: String, required: true },
    eid: { type: String, required: true },
  },
  shift: { type: String, enum: ['Day', 'Night'], required: true },
  company: { type: String, enum: ['B', 'BI'], required: true },
  productImageUrl: { type: String, required: true },
  
  // This is the array of subsets (boxes)
  boxes: [boxSchema],

}, { timestamps: true });

// Index the boxSerialNo within the boxes array for faster lookups if needed
mainItemSchema.index({ 'boxes.boxSerialNo': 1 });

module.exports = mongoose.model('MainItem', mainItemSchema);
