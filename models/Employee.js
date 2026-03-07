const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    mobile: {
      type: String,
      required: true,
      unique: true,
    },

  eid: {
  type: String,
  unique: true,
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

    // ✅ SINGLE ROLE
      role: {
    type: [String],
    required: true,
    enum: ['Helper', 'Mixture', 'Operator', 'Other'], // Fix options
  },
  
  // Doosra Dropdown (Sirf tab use hoga jab "Other" select ho)
  otherRoles: {
    type: [String], // Array kyunki multiple roles aa sakte hain
    default: [],
  },
    // ✅ SINGLE PASSWORD (HASHED)
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);



module.exports = mongoose.model("Employee", employeeSchema);