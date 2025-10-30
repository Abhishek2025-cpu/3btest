const mongoose = require('mongoose');

const boxSchema = new mongoose.Schema({
  boxSerialNo: { type: String, required: true },
  qrCodeUrl: { type: String, required: true },
  stockStatus: {
    type: String,
    enum: ['In Stock', 'Stock Out'],
    default: 'In Stock',
  },
}, { _id: true, timestamps: true });

// --- Updated schema ---
const mainItemSchema = new mongoose.Schema({
  itemNo: { type: String, required: true, unique: true },
  length: { type: String, required: true },
  noOfSticks: { type: Number, required: true },

  // ✅ multiple helpers/operators
  helpers: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      name: { type: String, required: true },
      eid: { type: String, required: true },
    }
  ],
  operators: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      name: { type: String, required: true },
      eid: { type: String, required: true },
    }
  ],

  shift: { type: String, enum: ['Day', 'Night'], required: true },
  company: { type: String, enum: ['B', 'BI'], required: true },
  productImageUrl: { type: String, required: true },

  boxes: [boxSchema],

  // ✅ new counters
  pendingBoxes: { type: Number, required: true },
  completedBoxes: { type: Number, default: 0 },

}, { timestamps: true });

mainItemSchema.index({ 'boxes.boxSerialNo': 1 });

module.exports = mongoose.model('MainItem', mainItemSchema);
