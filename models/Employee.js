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
      type: String,
      required: true,
    },

    // ✅ SINGLE PASSWORD (HASHED)
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// 🔐 HASH PASSWORD
employeeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔐 COMPARE PASSWORD
employeeSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Employee", employeeSchema);