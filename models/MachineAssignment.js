const mongoose = require('mongoose');

const machineAssignmentSchema = new mongoose.Schema({
  machine: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', required: true },
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true }], // ✅ array of ObjectId with ref
  assignedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('MachineAssignment', machineAssignmentSchema);
