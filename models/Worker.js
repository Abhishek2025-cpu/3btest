// models/Worker.js
const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    time: { type: [String], required: true },
    shift: { type: String, required: true },
    frameLength: { type: [Number], required: true },
    numberOfBox: { type: String },
    boxWeight: { type: String, required: true },
    frameWeight: { type: String, required: true },
    description: { type: String },
    updatedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Employee',
  default: null
}
,

    // References
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    machine: { type: String, required: true }, // store machine name
    item: { type: String, required: true }     // store item name
  },
  { timestamps: true }
);

module.exports = mongoose.model("Worker", WorkerSchema);
