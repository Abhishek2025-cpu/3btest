// models/Billing.js
const mongoose = require("mongoose");

const BillingSchema = new mongoose.Schema(
  {
    sellerDetails: { type: String, required: true }, // long text
    buyerDetails: { type: String, required: true }, // long text

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
      
        },
        subtotal: { type: Number },
        cgst: { type: Number },
        sgst: { type: Number },
        totalAmount: { type: Number },
      },
    ],

    grandTotal: { type: Number, required: true },
    companyBankDetails: { type: String, required: true }, // long text
  },
  { timestamps: true }
);

module.exports = mongoose.model("Billing", BillingSchema);
