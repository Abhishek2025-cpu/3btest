const mongoose = require("mongoose");

const InventoryItemSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true },
    productImage: { type: String, required: true },
    qty: { type: Number, required: true },
    numberOfBoxes: { type: Number, required: true },
    company: { type: String, required: true },
    status: { type: String, default: "active" }, // not required
    barcodeUrl: { type: String }, 
    barcodeId: { type: String }, 
    trackingHistory: [
      {
        type: {
          type: String,
         
          required: true
        },
        qty: Number,
        numberOfBoxes: Number,
        fromCompany: String,
        toCompany: String,
        timestamp: { type: Date, default: Date.now }
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryItem", InventoryItemSchema);
