const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    time: [String],
    shift: String,
    frameLength: [Number],
    numberOfBox: String,
    boxWeight: String,
    frameWeight: String,
    description: String,

    // THIS MUST be ObjectId with ref
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },

    machine: String,
    item: String,

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Worker", WorkerSchema);
