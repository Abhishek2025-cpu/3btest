// models/stockTransferModel.js

const mongoose = require('mongoose');

const stockTransferSchema = new mongoose.Schema({
  // --- References to other collections ---
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductUpload', // This must match the model name you used for products
    required: true
  },
  staffEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee', // This must match the model name you used for employees
    required: true
  },

  // --- Loading Details ---
  numberOfBoxes: { type: Number, required: true },
  startPoint: { type: String, required: true },
  endPoint: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  driverName: { type: String, required: true },
  loadingTimestamp: { type: Date, default: Date.now },

  // --- Unloading & Damage Details ---
  unloadingTimestamp: { type: Date, default: null },
  damagedBoxCount: { type: Number, default: 0 },
  damagedBoxIds: { type: [String], default: [] }, // e.g., ["001", "005"]

  // --- Live Status Tracking ---
  status: {
    type: String,
    enum: ['LOADING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
    default: 'LOADING'
  },
  statusHistory: [
    {
      _id: false,
      status: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ]

}, { timestamps: true });

// Middleware to add the initial status to history before saving
stockTransferSchema.pre('save', function(next) {
  // Only add to history if the status is new or has been modified
  if (this.isNew || this.isModified('status')) {
    this.statusHistory.push({ status: this.status });
  }
  next();
});


module.exports = mongoose.model('StockTransfer', stockTransferSchema);