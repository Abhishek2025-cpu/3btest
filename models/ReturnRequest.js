const mongoose = require('mongoose');
const { Schema } = mongoose;

const returnedProductSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'ProductUpload', // Reference to your Product model
    required: true,
  },
  quantityToReturn: {
    type: Number,
    required: true,
    min: 1,
  },
  reason: {
    type: String,
    enum: ['Damaged', 'Wrong Item', 'Not as Described', 'Other'],
    required: true,
  },
});

const returnRequestSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order', // Reference to your Order model
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to your User model
      required: true,
    },
    products: [returnedProductSchema], // Array of products being returned
    description: {
      type: String,
      required: true,
      trim: true,
    },
    boxSerialNumbers: {
      type: [String], // Array of serial numbers
      default: [],
    },
    boxImages: [
      {
        id: String,
        url: String,
      },
    ],
    damagedPieceImages: [
      {
        id: String,
        url: String,
      },
    ],
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Processing', 'Completed'],
      default: 'Pending',
    },
    adminNotes: {
      // For admins to leave comments on their decision
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);