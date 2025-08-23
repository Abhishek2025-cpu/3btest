// models/shipment.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const shipmentSchema = new Schema({
  vehicle: {
    type: String,
    required: [true, 'Vehicle type is required.'],
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required.'],
  },
  driverId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee', // Links to the Employee model
    required: [true, 'Driver ID is required.'],
  },
  helperId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee', // Links to the Employee model
    required: [true, 'Helper ID is required.'],
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order', // Links to the Order model
    required: [true, 'Order ID is required.'],
    unique: true, // Ensures one shipment per order
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required.'],
    min: [1, 'Quantity must be at least 1.'],
  },
  startPoint: {
    type: String,
    required: [true, 'Start point is required.'],
  },
  endPoint: {
    type: String,
    required: [true, 'End point is required.'],
  },
  // You might also want a status for the shipment itself
  status: {
    type: String,
    enum: ['Pending', 'In Transit', 'Delivered', 'Cancelled'],
    default: 'Pending',
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

module.exports = mongoose.model('Shipment', shipmentSchema);