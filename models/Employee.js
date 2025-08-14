const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true }, // Added unique constraint for safety

  // CHANGE 1: 'enum' has been removed. Any string value is now allowed for 'role'.
  role: { type: String, required: true },

  // 'otherRole' has been removed as it is no longer used by the controller.

  // CHANGE 2: 'dob' is now optional to match the form and prevent crashes.
  dob: { type: Date, required: false },

  eid: { type: String, required: true },
  password: { type: String, required: true },

  // CHANGE 3: 'adharNumber' is now optional to match the form and prevent crashes.
  adharNumber: { type: String, required: false },
  
  adharImageUrl: { type: String, required: true },
  status: { type: Boolean, default: true }, // active by default
  statusHistory: [
    {
      status: { type: Boolean, required: true },
      changedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);