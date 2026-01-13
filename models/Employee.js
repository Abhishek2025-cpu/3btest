const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  role: { type: String, required: true },
  eid: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: Boolean, default: true }
});

const employeeSchema = new mongoose.Schema({
  name: String,
  mobile: { type: String, unique: true },
  dob: Date,

  adharNumber: String,
  adharImageUrl: String,

  profilePic: {
    url: { type: String, default: null },
    fileId: { type: String, default: null }
  },

  roles: [roleSchema],   // 👈 multiple logins here

  status: { type: Boolean, default: true },
  statusHistory: [
    {
      status: Boolean,
      changedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Employee", employeeSchema);
