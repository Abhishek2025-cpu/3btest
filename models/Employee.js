const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: { type: String },

  mobile: {
    type: String,
    required: true,
    unique: true,
  },

  role: {
    type: String,
    required: true,
  },

  eid: {
    type: String,
    required: true,
  },

  password: {
    type: String,
    required: true,
  },

  status: {
    type: Boolean,
    default: true,
  },

  dob: Date,
  adharNumber: String,
  adharImageUrl: String,

  profilePic: {
    url: { type: String, default: null },
    fileId: { type: String, default: null },
  },

}, { timestamps: true });

module.exports = mongoose.model("Employee", employeeSchema);
