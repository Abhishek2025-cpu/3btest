const mongoose = require("mongoose");

const hsnSchema = new mongoose.Schema({
  hsnNumber: {
    type: String,
    required: true,
    unique: true,
  },
  goodsName: {
    type: String,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model("HSN", hsnSchema);
