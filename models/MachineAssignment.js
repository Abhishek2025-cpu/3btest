const mongoose = require('mongoose');

// Sub-schema for operator table
const OperatorSchema = new mongoose.Schema({
  shift: { type: String, enum: ['day', 'night'], required: true },
  time: { type: String },
  frameLength: [{ type: Number }], // Array of frame lengths
  numberOfBox: { type: Number },
  boxWeight: { type: String }, // e.g., "50kg"
  frameWeight: { type: String }, // e.g., "300-350kg"
  description: { type: String },
  image: { type: String } // Cloudinary URL
});

const machineAssignmentSchema = new mongoose.Schema({
  machine: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', required: true },
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true }],
  mainItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MainItem', required: true },
  shift: { type: String, enum: ['day', 'night'] },
  operatorTable: [OperatorSchema], // Array of operators
  assignedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('MachineAssignment', machineAssignmentSchema);
