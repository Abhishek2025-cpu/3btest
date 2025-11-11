const mongoose = require('mongoose');

const productOrderSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductUpload', required: false },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  color: { type: String, default: 'Not specified' },
  priceAtPurchase: { type: Number, required: true },
  image: {
    id: { type: String },
    url: { type: String }
  },
  orderId: { type: String, required: true, unique: true },
  currentStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  // Custom fields for "other products"
  company: { type: String },
  materialName: { type: String },
  modelNo: { type: String },
  selectedSize: { type: String },
  discount: { type: Number, default: 0 },
  totalPrice: { type: Number }
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [productOrderSchema],
  shippingDetails: {
    name: String,
    phone: String,
    addressType: String,
    detailedAddress: String
  },
  orderId: { type: String, required: true, unique: true },
  totalPrice: { type: Number, required: true },
  currentStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  returnEligible: {
  type: Boolean,
  default: true,
},

  statusHistory: [
    {
      status: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      notes: { type: String }
    }
  ],


}, { timestamps: true });


module.exports = mongoose.model('Order', orderSchema);
