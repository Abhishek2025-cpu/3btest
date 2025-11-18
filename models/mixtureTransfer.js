const mongoose = require("mongoose");

const mixtureTransferSchema = new mongoose.Schema({
  mainItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MainItem",
    required: true,
  },

  fromMixtureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },

  toMixtureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },

  // ❌ Remove formId (no longer used)
  // formId: { type: mongoose.Schema.Types.ObjectId, ref: "MixtureTable", required: true },

  // ✔ Store all transferred form IDs
  affectedFormIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MixtureTable",
    }
  ],

  reason: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("MixtureTransfer", mixtureTransferSchema);