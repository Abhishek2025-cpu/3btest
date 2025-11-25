const mongoose = require("mongoose");

const MixtureTableSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },   // <-- NEW (string instead of itemId)

    machineNo: { type: String, required: true },
    date: { type: String, required: true },
    shift: { type: String, required: true },
    mixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    time: { type: String, required: true },

    backDana: { type: Number, required: true },
    smoke: { type: Number, required: true },
    grayHips: { type: Number, required: true },
    eps: { type: Number, required: true },
    h1: { type: Number, required: true },
    yellowForm: { type: Number, required: true },
    whiteFormOptional: { type: Number, default: 0 },
    zink: { type: Number, required: true },
    oil: { type: Number, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MixtureTable", MixtureTableSchema);
