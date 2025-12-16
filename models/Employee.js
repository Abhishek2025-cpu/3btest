// models/Employee.js
const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: String,
  mobile: { type: String, unique: true },
  role: String,
  dob: Date,
  eid: String,
  password: String,
  adharNumber: String,
  adharImageUrl: String,
    profilePic: {
      url: { type: String, default: null },
      fileId: { type: String, default: null }
    },
  status: { type: Boolean, default: true },
  statusHistory: [
    {
      status: Boolean,
      changedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });


module.exports = mongoose.model("Employee", employeeSchema);
