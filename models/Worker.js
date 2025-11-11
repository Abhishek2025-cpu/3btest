const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  time: [{ type: String, required: true }], // Array of time slots like ["9-10", "10-11"]
  shift: { type: String, required: true }, // Day or Night (no enum restriction)
  frameLength: [{ type: Number, required: true }], // Array of numbers like [452, 453, 454]
  numberOfBox: { type: String, required: true },
  boxWeight: { type: String, required: true },
  frameWeight: { type: String, required: true },
  description: { type: String }, // optional
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Worker', workerSchema);
