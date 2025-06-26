const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemNo: { type: String, required: true },
  length: { type: String, required: true }, // e.g., '9.5 feet'
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
  stockStatus: {
  type: String,
  enum: ['In Stock', 'Stock Out'],
  default: 'In Stock',
},

  shift: { type: String, enum: ['Day', 'Night'], required: true },
  company: { type: String, enum: ['3B', 'B'], required: true },
  qrCodeUrl : { type: String, required: true },
  productImageUrl: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);
