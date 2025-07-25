const mongoose = require('mongoose');

const productOrderSchema = new mongoose.Schema({
productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductUpload', required: true },

  productName: { type: String, required: true }, // 🆕 Added product name
  quantity: { type: Number, required: true },
  color: { type: String, default: 'Not specified' },
  priceAtPurchase: { type: Number, required: true },
  image: {  // 🆕 Added image field
    id: { type: String },
    url: { type: String }
  },
  orderId: { type: String, required: true, unique: true },
  currentStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending'
  }
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [productOrderSchema],
  shippingDetails: {
    name: String,
    phone: String, // 🛠️ You had this as `number`, but are using `phone` in controller. Make sure they match.
    addressType: String,
    detailedAddress: String
  },
  orderId: { type: String, required: true, unique: true },
  
  totalPrice: {
  type: Number,
  required: true
},

  currentStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
