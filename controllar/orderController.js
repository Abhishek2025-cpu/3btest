// controllers/orderController.js
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/ProductUpload');
const OtherProduct = require('../models/otherProduct');
const GstDetails = require('../models/GstDetails'); 
const Company = require('../models/company'); 
const ReturnRequest  = require('../models/ReturnRequest');


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
  productId: product._id || null,
  productName: product.productName || product.name || item.productName || 'Unknown Product',
  quantity: item.quantity,
  color: item.color || 'Not specified',
  priceAtPurchase: priceForCalculation,
  subtotal: productSubtotal,
  image,
  orderId: generateOrderId(),

  // ✅ Include other product fields from payload
  company: item.company || null,
  materialName: item.materialName || null,
  modelNo: item.modelNo || null,
  selectedSize: item.selectedSize || null,
  discount: item.discount || 0,
  totalPrice: item.totalPrice || productSubtotal
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

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email number')
      .populate('products.productId'); // This populates the full product document

    // Preload all companies once to avoid querying DB repeatedly
    const companies = await Company.find();
    const companyMap = {};
    companies.forEach(c => {
      companyMap[c.name.toLowerCase()] = c;
    });

    const formattedOrders = orders.map(order => {
      const populatedOrder = order.toObject();

      populatedOrder.totalAmount = order.products.reduce(
        (sum, item) => sum + (item.priceAtPurchase * item.quantity),
        0
      );

      populatedOrder.user = populatedOrder.userId;
      delete populatedOrder.userId;

      populatedOrder.products = populatedOrder.products.map(item => {
        const isOtherProduct = !item.productId || typeof item.productId === 'string';

        if (isOtherProduct) {
          // Try to get company details if present
          let companyDetails = null;
          if (item.company) {
            const key = item.company.toLowerCase();
            companyDetails = companyMap[key] || null;
          }

          return {
            productId: null,
            productName: item.productName || 'Custom Product',
            quantity: item.quantity,
            color: item.color || null,
            priceAtPurchase: item.priceAtPurchase,
            image: item.image || null,
            orderId: item.orderId,
            currentStatus: item.currentStatus,
            discount: item.discount || 0,
            selectedSize: item.selectedSize || null,
            materialName: item.materialName || null,
            modelNo: item.modelNo || null,
            totalPrice: item.totalPrice || (item.priceAtPurchase * item.quantity),
            totalPiecesPerBox: null, // MODIFICATION: Added for consistency
            // Company details
            company: companyDetails
              ? {
                  name: companyDetails.name,
                  logo: companyDetails.logo
                }
              : {
                  name: item.company || 'Unknown',
                  logo: null
                }
          };
        } else {
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
            currentStatus: item.currentStatus,
            // MODIFICATION: Added totalPiecesPerBox from the populated product
            totalPiecesPerBox: product.totalPiecesPerBox || null 
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



exports.getOrdersByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email number')
      .populate('products.productId', 'name price dimensions discount totalPiecesPerBox');

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found for this user.',
      });
    }

    const orderIds = orders.map(order => order._id);
    const returnRequests = await ReturnRequest.find({ orderId: { $in: orderIds } });

    const returnStatusLookup = {};
    returnRequests.forEach(request => {
      const orderIdStr = request.orderId.toString();
      if (!returnStatusLookup[orderIdStr]) {
        returnStatusLookup[orderIdStr] = {};
      }
      request.products.forEach(product => {
        const productIdStr = product.productId.toString();
        returnStatusLookup[orderIdStr][productIdStr] = request.status;
      });
    });

    const formattedOrders = orders.map(order => {
      const orderObj = order.toObject();
      const orderIdStr = orderObj._id.toString();

      const productsWithPopulatedData = orderObj.products.map(product => {
        if (product.productId === null) {
          return {
            ...product,
            productId: { _id: product._id, name: product.productName, price: product.priceAtPurchase }
          };
        }
        return product;
      });

      const productsWithStatus = productsWithPopulatedData.map(product => {
        const productIdStr = product.productId._id.toString();
        const status = returnStatusLookup[orderIdStr]?.[productIdStr] || 'Not Returned';
        return { ...product, return_status: status };
      });

      const finalProducts = productsWithStatus.filter(
        product => product.return_status !== 'Completed'
      );
      
      const totalAmount = finalProducts.reduce((sum, item) => {
        return sum + (item.priceAtPurchase * item.quantity);
      }, 0);
      
      // --- ROBUSTNESS FIX WITH FALLBACK LOGIC ---
      let deliveredAt = null;
      
      if (orderObj.currentStatus === 'Delivered') {
        // First, try to find the specific event in history (for new orders)
        const deliveryEvent = (orderObj.statusHistory || [])
          .slice()
          .reverse()
          .find(history => history.status === 'Delivered');
          
        if (deliveryEvent) {
          // If found, use its precise timestamp
          deliveredAt = deliveryEvent.timestamp;
        } else {
          // FALLBACK: If not found (for old orders), use the order's last update time.
          deliveredAt = orderObj.updatedAt;
        }
      }
      // --- END FIX ---

      return {
        ...orderObj,
        products: finalProducts,
        totalAmount,
        deliveredAt,
      };
    });

    const finalOrders = formattedOrders.filter(order => order.products.length > 0);

    return res.status(200).json({
      success: true,
      count: finalOrders.length,
      orders: finalOrders,
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

    // Update the top-level order status
    order.currentStatus = newStatus;

    // --- FIX START: Record the change in statusHistory ---
    // This is the crucial line you were missing.
    order.statusHistory.push({
      status: newStatus,
      notes: `Status changed to ${newStatus}` // Optional but good practice
    });
    // --- FIX END ---

    // Also update currentStatus for each product (this is fine)
    if (order.products && order.products.length > 0) {
      order.products.forEach(product => {
        product.currentStatus = newStatus;
      });
    }

    // The .save() method will now save the new currentStatus AND the updated statusHistory array
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





