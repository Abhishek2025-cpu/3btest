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

     selfie: {
      url: { type: String, default: null },
      fileId: { type: String, default: null } // GCS path
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
