const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  role: { type: String, enum: ['Operator', 'Helper', 'Mixture', 'Other'], required: true },
  otherRole: { type: String, default: '' },
  dob: { type: Date, required: true },
  eid: { type: String, required: true },
  password: { type: String, required: true },
  adharNumber: { type: String, required: true },
  adharImageUrl: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);