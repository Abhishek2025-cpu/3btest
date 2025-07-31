// controllers/orderController.js
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/ProductUpload');
const OtherProduct = require('../models/otherProduct');
const GstDetails = require('../models/GstDetails'); 


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
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

  const gst = await GstDetails.findOne({ userId });

if (!gst || !gst.gstin) {
  return res.status(400).json({
    success: false,
    message: 'GSTIN not found. Please complete GST verification before placing an order.'
  });
}


    const shippingAddress = user.shippingAddresses.id(shippingAddressId);
    if (!shippingAddress) {
      return res.status(404).json({ success: false, message: 'Shipping address not found' });
    }

    // 2. Process items, calculate total, and deduct stock
    let totalPrice = 0; // This will accumulate the precise floating-point total
    const products = await Promise.all(
      items.map(async item => {
        // Try ProductUpload first
        let product = await Product.findById(item.productId);
        let isOtherProduct = false;

        // If not found, try OtherProduct
        if (!product) {
          product = await OtherProduct.findById(item.productId);
          isOtherProduct = true;
        }
        if (!product) {
          // Throw a specific error if no product is found at all
          throw new Error(`Product not found with ID: ${item.productId}`);
        }

        // Deduct quantity and update availability (if stock is tracked)
        if (typeof product.quantity === 'number') {
          if (product.quantity < item.quantity) {
            throw new Error(`Insufficient stock for product: ${product.name || product.productname}`);
          }
          product.quantity -= item.quantity;
          if (product.quantity <= 0) {
            product.quantity = 0;
            product.available = false;
          }
          await product.save();
        }

        // Select correct image
        let image = null;
        if (!isOtherProduct) {
          const colorKey = item.color?.trim();
          if (colorKey && product.colorImageMap && product.colorImageMap[colorKey]) {
            image = product.colorImageMap[colorKey];
          } else if (product.images && product.images.length) {
            image = product.images[0];
          }
        } else {
          // For OtherProduct, fallback to images or a default field
          if (product.images && product.images.length) {
            image = product.images[0];
          } else if (product.image) {
            image = product.image;
          }
        }

        // ====================================================================
        // FIX 1: Reliably handle price from the request payload
        // This handles cases where the price is sent as `item.price` or `item.priceAtPurchase`.
        // ====================================================================
        const priceForCalculation = item.price || item.priceAtPurchase;

        // Add a safety check to prevent NaN errors if price is missing entirely.
        if (typeof priceForCalculation !== 'number') {
          throw new Error(`Price is missing or invalid for product: ${item.productName || item.productId}`);
        }

        const productSubtotal = priceForCalculation * item.quantity;
        totalPrice += productSubtotal;

        return {
          productId: product._id,
          productName: product.productName || product.name || item.productName || 'Unknown Product',
          quantity: item.quantity,
          color: item.color || 'Not specified',
          // Use the reliable price to populate the required schema field
          priceAtPurchase: priceForCalculation,
          subtotal: productSubtotal,
          image,
          orderId: generateOrderId() // This was in your original code. Ensure this is intended per-product.
        };
      })
    );

    // ====================================================================
    // FIX 2: Round the final total price to the nearest integer.
    // ====================================================================
    const roundedTotalPrice = Math.round(totalPrice);

    // 3. Create new order
    const newOrder = new Order({
      userId,
      products,
      totalPrice: roundedTotalPrice, // Use the new rounded total price
      shippingDetails: {
        name: shippingAddress.name,
        phone: shippingAddress.phone, // Reminder: Ensure your schema uses 'phone' and not 'number'.
        addressType: shippingAddress.addressType,
        detailedAddress: shippingAddress.detailedAddress
      },
      orderId: generateOrderId(), // This is the main ID for the entire order.
      currentStatus: "Pending",
       gstin: gst.gstin ,
      tracking: [{
        status: "Pending",
        updatedAt: new Date()
      }]
    });

    await newOrder.save();

    // 4. Send successful response
    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
      totalPrice: roundedTotalPrice, // Send the rounded total price in the response
      productBreakdown: products.map(p => ({
        productId: p.productId,
        name: p.productName,
        quantity: p.quantity,
        color: p.color,
        priceAtPurchase: p.priceAtPurchase,
        subtotal: p.subtotal,
        gstDetails: {
           gstin: gst.gstin,
           legalName: gst.legalName || '',
            tradeName: gst.tradeName || '',
            address: gst.address || '',
             state: gst.state || '',
             district: gst.district || '',
               pincode: gst.pincode || ''
              }
      }))
    });

  } catch (error) {
    // 5. Catch and handle any errors gracefully
    console.error('Error placing order:', error);
    res.status(500).json({
      success: false,
      message: error.message, // Send the specific error message for easier debugging
      error: 'Server error placing order.'
    });
  }
};
// ...existing code...


// exports.placeOrder = async (req, res) => {
//   try {
//     const { userId, shippingAddressId, items } = req.body;

//     // 1. Get User and selected shipping address
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ success: false, message: 'User not found' });

//     const shippingAddress = user.shippingAddresses.id(shippingAddressId);
//     if (!shippingAddress) {
//       return res.status(404).json({ success: false, message: 'Shipping address not found' });
//     }

//     // 2. Process items and deduct stock
//     let totalPrice = 0;
//     const products = await Promise.all(
//       items.map(async item => {
//         const product = await Product.findById(item.productId);
//         if (!product) throw new Error('Product not found');

//         if (product.quantity < item.quantity) {
//           throw new Error(`Insufficient stock for product: ${product.name}`);
//         }

//         // Deduct quantity and update availability
//         product.quantity -= item.quantity;
//         if (product.quantity <= 0) {
//           product.quantity = 0;
//           product.available = false;
//         }
//         await product.save();

//         // Select correct image
//         let image = null;
//         const colorKey = item.color?.trim();
//         if (colorKey && product.colorImageMap && product.colorImageMap[colorKey]) {
//           image = product.colorImageMap[colorKey];
//         } else if (product.images && product.images.length) {
//           image = product.images[0];
//         }

//         const productSubtotal = item.price * item.quantity;
//         totalPrice += productSubtotal;

//         return {
//           productId: product._id,
//           productName: product.name,
//           quantity: item.quantity,
//           color: item.color || 'Not specified',
//           priceAtPurchase: item.price,
//           subtotal: productSubtotal,
//           image,
//           orderId: generateOrderId()
//         };
//       })
//     );

//     // 3. Create new order
//     const newOrder = new Order({
//       userId,
//       products,
//       totalPrice,
//       shippingDetails: {
//         name: shippingAddress.name,
//         phone: shippingAddress.phone,
//         addressType: shippingAddress.addressType,
//         detailedAddress: shippingAddress.detailedAddress
//       },
//       orderId: generateOrderId(),
//       currentStatus: "Pending",
//       tracking: [{
//         status: "Pending",
//         updatedAt: new Date()
//       }]
//     });

//     await newOrder.save();

//     res.status(201).json({
//       success: true,
//       message: "Order placed successfully",
//       order: newOrder,
//       totalPrice,
//       productBreakdown: products.map(p => ({
//         productId: p.productId,
//         name: p.productName,
//         quantity: p.quantity,
//         color: p.color,
//         priceAtPurchase: p.priceAtPurchase,
//         subtotal: p.subtotal
//       }))
//     });

//   } catch (error) {
//     console.error('Error placing order:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//       error: 'Server error placing order.'
//     });
//   }
// };



//get products
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email number')
      .populate('products.productId');

    const formattedOrders = orders.map(order => {
      const populatedOrder = order.toObject();

      // Calculate totalAmount
      populatedOrder.totalAmount = order.products.reduce(
        (sum, item) => sum + (item.priceAtPurchase * item.quantity),
        0
      );

      // Set user object
      populatedOrder.user = populatedOrder.userId;
      delete populatedOrder.userId;

      // Map products (normal + "other" products)
      populatedOrder.products = populatedOrder.products.map(item => {
        const isOtherProduct = !item.productId || typeof item.productId === 'string';

        if (isOtherProduct) {
          // Handle "Other Product" with extra custom fields
          return {
            productId: null,
            productName: item.productName || 'Custom Product',
            quantity: item.quantity,
            color: item.color || null,
            priceAtPurchase: item.priceAtPurchase,
            image: item.image || null,
            orderId: item.orderId,
            currentStatus: item.currentStatus,
            // Additional custom fields
            company: item.company,
            materialName: item.materialName,
            modelNo: item.modelNo,
            selectedSize: item.selectedSize,
            discount: item.discount || 0,
            totalPrice: item.totalPrice
          };
        } else {
          // Handle regular product
          const product = item.productId || {};
          const colorImageMap = product.colorImageMap || {};
          const images = product.images || [];

          let image = colorImageMap[item.color];
          if (!image && images.length > 0) image = images[0];

          return {
            productId: product._id,
            productName: product.name,
            quantity: item.quantity,
            color: item.color,
            priceAtPurchase: item.priceAtPurchase,
            image: image || null,
            orderId: item.orderId,
            currentStatus: item.currentStatus
          };
        }
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



// exports.getOrders = async (req, res) => {
//   try {
//     const orders = await Order.find()
//       .sort({ createdAt: -1 })
//       .populate('userId', 'name email number')
//       .populate('products.productId');

//     const formattedOrders = orders.map(order => {
//       const populatedOrder = order.toObject();

//       // Add totalAmount calculation
//       populatedOrder.totalAmount = order.products.reduce(
//         (sum, item) => sum + (item.priceAtPurchase * item.quantity),
//         0
//       );

//       // Add product details and ensure image
//       populatedOrder.user = populatedOrder.userId;
//       delete populatedOrder.userId;

//       populatedOrder.products = populatedOrder.products.map(item => {
//         const product = item.productId || {};
//         const colorImageMap = product.colorImageMap || {};
//         const images = product.images || [];

//         // Try to fetch color-specific image
//         let image = colorImageMap[item.color];

//         // If not found, fallback to first product image
//         if (!image && images.length > 0) {
//           image = images[0];
//         }

//         return {
//           productId: product._id,
//           productName: product.name,
//           quantity: item.quantity,
//           color: item.color,
//           priceAtPurchase: item.priceAtPurchase,
//           image: image || {}, // ensure it’s not undefined
//           orderId: item.orderId,
//           currentStatus: item.currentStatus
//         };
//       });

//       return populatedOrder;
//     });

//     res.status(200).json({
//       success: true,
//       count: formattedOrders.length,
//       orders: formattedOrders
//     });
//   } catch (error) {
//     console.error('Error fetching orders:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error fetching orders.',
//       error: error.message
//     });
//   }
// };






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





