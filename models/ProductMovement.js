const mongoose = require("mongoose");

const productMovementSchema = new mongoose.Schema({
  productName: { type: String,  },
  productQty: { type: Number,  },
  mrpPerBox: { type: Number,  },

  productImages: [
    { id: String, url: String }
  ],

  colorImages: [
    { id: String, url: String }
  ],

  filledBy: { type: String },

  toCompany: { type: String, default: null },
  toClient: { type: String, default: null },

  qtyByClient: { type: Number, },

  direction: {
    type: String,
   
   
  }

}, { timestamps: true });

module.exports = mongoose.model("ProductMovement", productMovementSchema);
