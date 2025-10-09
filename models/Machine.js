const mongoose = require("mongoose");

const MachineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    companyName: { type: String, required: true },
    dateOfManufacturing: { type: Date, required: true },
    type: { type: String, required: true },
    image: { type: String }, // Cloudinary URL
  },
  { timestamps: true }
);

module.exports = mongoose.model("Machine", MachineSchema);
