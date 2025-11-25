const mongoose = require("mongoose");

const MixtureTableSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MainItem", required: true },
    machineNo: { type: String, required: true },
    date: { type: String, required: true },
    shift: { type: String, required: true },
    mixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    time: { type: String, required: true },

    // Updated fields as per your new data names & units
    backDana: { type: Number, required: true },            // Block Gula (kg)
    smoke: { type: Number, required: true },               // white Gula (kg)
    grayHips: { type: Number, required: true },            // white gula grade (kg)
    eps: { type: Number, required: true },                 // EPS (kg)
    h1: { type: Number, required: true },                  // H1 (kg)
    yellowForm: { type: Number, required: true },          // Yellow form (gms)
    whiteFormOptional: { type: Number, default: 0 },       // white form optional (gms)
    zink: { type: Number, required: true },                // zink (gms)
    oil: { type: Number, required: true }                  // oil (gmo)
  },
  { timestamps: true }
);

module.exports = mongoose.model("MixtureTable", MixtureTableSchema);
