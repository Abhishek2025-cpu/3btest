// controllers/orderController.js
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/ProductUpload');


const generateOrderId = () => {
  const prefix = '#3b';
  const random = Math.floor(100000000000 + Math.random() * 900000000000); // 12 digits
  return `${prefix}${random}`;
};

exports.placeOrder = async (req, res) => {
  try {
    const { userId, shippingAddressId, items } = req.body;

    // 1. Get User and selected shipping address
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const shippingAddress = user.shippingAddresses.id(shippingAddressId);
    if (!shippingAddress) {
      return res.status(404).json({ success: false, message: 'Shipping address not found' });
    }

    // 2. Process items and deduct stock
    const products = await Promise.all(
      items.map(async item => {
        const product = await Product.findById(item.productId);
        if (!product) throw new Error('Product not found');

        if (product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }

        product.quantity -= item.quantity;
        if (product.quantity <= 0) {
          product.quantity = 0;
          product.available = false;
        }
        await product.save();

        // Determine correct image based on selected color
        let image = null;
        const colorKey = item.color?.trim();
        if (colorKey && product.colorImageMap && product.colorImageMap[colorKey]) {
          image = product.colorImageMap[colorKey];
        } else if (product.images && product.images.length) {
          image = product.images[0]; // fallback to first image
        }

        return {
          productId: product._id,
          productName: product.name,
          quantity: item.quantity,
          color: item.color || 'Not specified',
          priceAtPurchase: item.price,
          image, // includes { id, url }
          orderId: generateOrderId()
        };
      })
    );

    // 3. Create new order
    const newOrder = new Order({
      userId,
      products,
      shippingDetails: {
        name: shippingAddress.name,
        phone: shippingAddress.phone,
        addressType: shippingAddress.addressType,
        detailedAddress: shippingAddress.detailedAddress
      },
      orderId: generateOrderId(),
      currentStatus: "Pending",
      tracking: [{
        status: "Pending",
        updatedAt: new Date()
      }]
    });

    await newOrder.save();

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder
    });

  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error placing order.',
      error: error.message
    });
  }
};


//get products


exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email number')
      .populate('products.productId');

    const formattedOrders = orders.map(order => {
      const populatedOrder = order.toObject();

      // Add totalAmount calculation
      populatedOrder.totalAmount = order.products.reduce(
        (sum, item) => sum + (item.priceAtPurchase * item.quantity),
        0
      );

      // Add product details and ensure image
      populatedOrder.user = populatedOrder.userId;
      delete populatedOrder.userId;

      populatedOrder.products = populatedOrder.products.map(item => {
        const product = item.productId || {};
        const colorImageMap = product.colorImageMap || {};
        const images = product.images || [];

        // Try to fetch color-specific image
        let image = colorImageMap[item.color];

        // If not found, fallback to first product image
        if (!image && images.length > 0) {
          image = images[0];
        }

        return {
          productId: product._id,
          productName: product.name,
          quantity: item.quantity,
          color: item.color,
          priceAtPurchase: item.priceAtPurchase,
          image: image || {}, // ensure it’s not undefined
          orderId: item.orderId,
          currentStatus: item.currentStatus
        };
      });

      return populatedOrder;
    });

    res.status(200).json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching orders.',
      error: error.message
    });
  }
};






// controllers/orderController.js

exports.getOrdersByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email number')
      .populate('products.productId', 'name price dimensions discount');

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found for this user.',
      });
    }

    const formattedOrders = orders.map(order => {
      const orderObj = order.toObject();

      const totalAmount = order.products.reduce((sum, item) => {
        return sum + (item.priceAtPurchase * item.quantity);
      }, 0);

      // Optional: Sanitize or format data here as needed

      return {
        ...orderObj,
        totalAmount,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching user orders.',
      error: error.message,
    });
  }
};



// PATCH /api/orders/update-status/:orderId
// PATCH /api/orders/status/:id
exports.updateOrderStatusById = async (req, res) => {
  const { id } = req.params;
  const { newStatus } = req.body;

  if (!newStatus) {
    return res.status(400).json({
      success: false,
      message: 'New status is required'
    });
  }

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update only the top-level order status
    order.currentStatus = newStatus;

    // Also update currentStatus for each product (if required)
    if (order.products && order.products.length > 0) {
      order.products.forEach(product => {
        product.currentStatus = newStatus;
      });
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      currentStatus: order.currentStatus
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating order status'
    });
  }
};





