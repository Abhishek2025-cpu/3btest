// models/Billing.js
const mongoose = require("mongoose");

const BillingSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },

    sellerDetails: { type: String, required: true },
    buyerDetails: { type: String, required: true }, // will be auto-filled from user

    invoiceNumber: { type: String, required: true, unique: true },
    billDate: { type: Date, required: true },
    deliveryNote: { type: String },
    paymentTerms: { type: String },
    buyersOrderNo: { type: String },
    buyersOrderDate: { type: Date },
    docDispatchNo: { type: String },
    deliveryDate: { type: Date },
    dispatchThrough: { type: String },
    destination: { type: String },
    motorVehicleNumber: { type: String },
    billOfLadingNo: { type: String },

    goods: [
      {
        purchaseItem: { type: String, required: true },
        hsnSacNo: { type: String },
        qty: { type: Number, required: true },
        rate: { type: Number, required: true },
        rateType: {
          type: String,
          enum: ["per_unit", "kg", "litre", "custom"],
          default: "per_unit",
        },
        subtotal: { type: Number },
        cgst: { type: Number },
        sgst: { type: Number },
        totalAmount: { type: Number },
      },
    ],

    grandTotal: { type: Number, required: true },
    companyBankDetails: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Billing", BillingSchema);
