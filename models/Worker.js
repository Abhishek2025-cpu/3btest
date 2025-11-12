// models/Worker.js
const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    time: { type: [String], required: true },
    shift: { type: String, required: true },
    frameLength: { type: [Number], required: true },
    numberOfBox: { type: String, required: true },
    boxWeight: { type: String, required: true },
    frameWeight: { type: String, required: true },
    description: { type: String },

    // 🔗 References
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "MainItem", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Worker", WorkerSchema);
