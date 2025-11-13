const mongoose = require("mongoose");

const taskTransferSchema = new mongoose.Schema(
  {
    mainItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MainItem", // ✅ FIXED reference
      required: true,
    },
    fromEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    toEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    reason: {
      type: String,
      default: "Not specified",
    },
    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee", // Admin/Manager
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TaskTransfer", taskTransferSchema);
