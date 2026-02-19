const mongoose = require('mongoose');

/* ================== BOX SCHEMA ================== */
const boxSchema = new mongoose.Schema({
  boxSerialNo: { type: String, required: true },
  qrCodeUrl: { type: String, required: true },
  stockStatus: {
    type: String,
    enum: ['In Stock', 'Stock Out'],
    default: 'In Stock',
  },
}, { _id: true, timestamps: true });

/* ================== EMPLOYEE REF SCHEMA ================== */
const employeeRefSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  role: {
    type: String,
    required: true, // helper / operator / mixture
  },
  roleEid: {
    type: String,
    required: true, // eid from Employee
  }
}, { _id: false }); // prevents extra _id inside helpers/operators arrays

/* ================== MAIN ITEM SCHEMA ================== */
const mainItemSchema = new mongoose.Schema({

  itemNo: { type: String, required: true, trim: true },

  length: { type: String, required: true },
  noOfSticks: { type: Number, required: true },

  helpers: [employeeRefSchema],
  operators: [employeeRefSchema],
  mixtures: [employeeRefSchema],

  shift: { type: String, enum: ['Day', 'Night'], required: true },
  company: { type: String, enum: ['B', 'BI'], required: true },

  productImageUrl: { type: String, required: true },

  boxes: [boxSchema],

  pendingBoxes: { type: Number, required: true },
  completedBoxes: { type: Number, default: 0 },

  machineNumber: { type: String },
  mixtureMachine: { type: String },

}, { timestamps: true });

/* ================== INDEX ================== */
mainItemSchema.index({ 'boxes.boxSerialNo': 1 });

module.exports = mongoose.model('MainItem', mainItemSchema);
