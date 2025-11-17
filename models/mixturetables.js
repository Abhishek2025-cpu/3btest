const mongoose = require("mongoose");

const MixtureTableSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MainItem", required: true },
    machineNo: { type: String, required: true },
    date: { type: String, required: true },
    shift: { type: String, required: true },
    mixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    time: { type: String, required: true },

    blackGula: { type: Number, required: true },
    whiteGula: { type: Number, required: true },
    whiteGulaGrades: { type: Number, required: true },
    yellowForm: { type: Number, required: true },
    whiteForm: { type: Number }, // optional
    zinc: { type: Number, required: true },
    oil: { type: Number, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MixtureTable", MixtureTableSchema);
