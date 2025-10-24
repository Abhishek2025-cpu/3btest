const mongoose = require('mongoose');

// Operator sub-schema (without image)
const OperatorSchema = new mongoose.Schema({
  shift: { type: String, enum: ['day', 'night'], required: true },
  time: { type: String },
  frameLength: [{ type: Number }],
  numberOfBox: { type: Number },
  boxWeight: { type: String },
  frameWeight: { type: String },
  description: { type: String }
});

// Main schema
const machineAssignmentSchema = new mongoose.Schema({
  machine: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', required: true },
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true }],
  mainItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MainItem', required: true },
  shift: { type: String, enum: ['day', 'night'] },
  operatorTable: [OperatorSchema],
  operatorImages: [{ type: String }], // separate array for uploaded images
  assignedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('MachineAssignment', machineAssignmentSchema);
