// controllers/orderController.js
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/ProductUpload');
const OtherProduct = require('../models/otherProduct');
const Notification = require('../models/Notification');
const ReturnRequest = require('../models/ReturnRequest');
const Company = require('../models/company');
const { translateResponse } = require("../services/translation.service");

const { sendNotification } = require("../services/notificationService");
const axios = require('axios');


const generateOrderId = () => {
  const prefix = '#3b';
  const random = Math.floor(100000000000 + Math.random() * 900000000000); 
  return `${prefix}${random}`; // FIXED: Added backticks
};

// controllers/orderController.js
// ... (keep your imports)

exports.placeOrder = async (req, res) => {
  try {
    const { userId, shippingAddressId, items } = req.body;

    // 1. Validate User & Address
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const shippingAddress = user.shippingAddresses.id(shippingAddressId);
    if (!shippingAddress)
      return res.status(404).json({ success: false, message: "Shipping address not found" });

    let totalPrice = 0;

    // 2. Process items
    const products = await Promise.all(
      items.map(async (item) => {
        let product = await Product.findById(item.productId);
        let TargetModel = Product; 
        let isOtherProduct = false;

        if (!product) {
          product = await OtherProduct.findById(item.productId);
          TargetModel = OtherProduct;
          isOtherProduct = true;
        }

        if (!product) throw new Error(`Product not found with ID: ${item.productId}`);

        // 3. Stock Update (Native driver bypass to avoid categoryId validation error)
        if (typeof product.quantity === "number") {
          if (product.quantity < item.quantity)
            throw new Error(`Insufficient stock for product: ${product.productName || product.name}`);
          
          let newQuantity = product.quantity - item.quantity;
          
          await TargetModel.collection.updateOne(
            { _id: product._id }, 
            { $set: { quantity: newQuantity, available: newQuantity > 0 } }
          );
        }

        // 4. Format Image for Order Schema { id, url }
        let imageObj = { id: "", url: "" };
        const colorKey = item.color?.trim();
        let rawImg = (!isOtherProduct && colorKey && product.colorImageMap?.[colorKey]) 
                     ? product.colorImageMap[colorKey] 
                     : (product.images?.[0] || product.image || null);

        if (typeof rawImg === 'string') {
          imageObj.url = rawImg;
        } else if (rawImg) {
          imageObj.id = rawImg.id || "";
          imageObj.url = rawImg.url || "";
        }

        const priceAtPurchase = item.price || item.priceAtPurchase || 0;
        const subtotal = priceAtPurchase * item.quantity;
        totalPrice += subtotal;

        // Return object formatted for productOrderSchema
        return {
          productId: product._id,
          productName: product.productName || product.name || "Unknown Product",
          quantity: item.quantity,
          color: item.color || "Not specified",
          priceAtPurchase: priceAtPurchase,
          image: imageObj,
          orderId: generateOrderId(), // Individual item Order ID
          currentStatus: "Pending"
        };
      })
    );

    // 5. Create Order Document
    const newOrder = new Order({
      userId,
      products,
      totalPrice: Math.round(totalPrice),
      shippingDetails: {
        name: shippingAddress.name,
        phone: shippingAddress.phone,
        addressType: shippingAddress.addressType,
        detailedAddress: shippingAddress.detailedAddress,
      },
      orderId: generateOrderId(), // Main Order ID
      currentStatus: "Pending",
      returnEligible: true,
      statusHistory: [{ status: "Pending", timestamp: new Date(), notes: "Order placed successfully" }],
    });

    // 6. Save to Database
    const savedOrder = await newOrder.save();

  // 7. Send Notification (non-blocking)
try {
  console.log("📢 Sending notification...");
  console.log("User tokens:", user.fcmTokens);

  if (user.fcmTokens && user.fcmTokens.length > 0) {
    sendNotification(
      user._id,
      user.fcmTokens,
      "🎉 Order Placed!",
      `Dear ${user.name}, your order ${savedOrder.orderId} was successful.`,
      { orderId: savedOrder._id.toString() }
    ).catch(err => console.error("❌ Notification error:", err));
  } else {
    console.log("⚠️ No FCM tokens found for user");
  }

} catch (e) {
  console.error("❌ Notification trigger error:", e);
}

    // 8. Return ENTIRE data
    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: savedOrder // This contains the full object from the DB
    });

  } catch (error) {
    console.error("❌ Order Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      error: "Server error during order placement"
    });
  }
};




exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email number')
      .populate('products.productId');

    const companies = await Company.find();
    const companyMap = {};
    companies.forEach(c => (companyMap[c.name.toLowerCase()] = c));

    const now = new Date();

    const formattedOrders = await Promise.all(
      orders.map(async (order) => {
        const populatedOrder = order.toObject();

        // ✅ Determine delivery date
        const deliveredAt = order.deliveredAt || order.deliveredVerifiedAt || order.updatedAt;
        const deliveryDate = deliveredAt ? new Date(deliveredAt) : null;

        // ✅ Calculate days since delivery
        const diffInDays = deliveryDate
          ? Math.floor((now - deliveryDate) / (1000 * 60 * 60 * 24))
          : null;

        // ✅ Set return eligibility (Delivered within 30 days only)
        let returnEligible = false;
        if (order.currentStatus === 'Delivered' && diffInDays <= 30) {
          returnEligible = true;
        }

        populatedOrder.returnEligible = returnEligible;

        populatedOrder.totalAmount = order.products.reduce(
          (sum, item) => sum + item.priceAtPurchase * item.quantity,
          0
        );

        populatedOrder.user = populatedOrder.userId;
        delete populatedOrder.userId;

        populatedOrder.products = populatedOrder.products.map(item => {
          const isOtherProduct = !item.productId || typeof item.productId === 'string';
          if (isOtherProduct) {
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
              totalPrice: item.totalPrice || item.priceAtPurchase * item.quantity,
              totalPiecesPerBox: null,
              company: companyDetails
                ? { name: companyDetails.name, logo: companyDetails.logo }
                : { name: item.company || 'Unknown', logo: null },
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
              totalPiecesPerBox: product.totalPiecesPerBox || null,
            };
          }
        });

        return populatedOrder;
      })
    );
const fieldsToTranslate = [
      'currentStatus',
      'products.productName',
      'products.color',
      'products.currentStatus',
      'products.materialName',
      'products.company.name'
    ];

    const translatedOrders = await translateResponse(req, formattedOrders, fieldsToTranslate);

    res.status(200).json({
      success: true,
      count:  translatedOrders.length,
      orders: translatedOrders,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching orders.',
      error: error.message,
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

    const now = new Date();

    const formattedOrders = orders.map(order => {
      const orderObj = order.toObject();
      const orderIdStr = orderObj._id.toString();

      const productsWithStatus = orderObj.products.map(product => {
        const productIdStr = product.productId?._id?.toString() || product._id?.toString();
        const status = returnStatusLookup[orderIdStr]?.[productIdStr] || 'Not Returned';
        return { ...product, return_status: status };
      });

      const totalAmount = productsWithStatus.reduce(
        (sum, item) => sum + item.priceAtPurchase * item.quantity,
        0
      );

      // ✅ Determine delivery date
      let deliveredAt = null;
      if (orderObj.currentStatus === 'Delivered') {
        const deliveryEvent = (orderObj.statusHistory || [])
          .slice()
          .reverse()
          .find(history => history.status === 'Delivered');
        deliveredAt = deliveryEvent ? deliveryEvent.timestamp : orderObj.updatedAt;
      }

      // ✅ Apply 30-day return eligibility
      let returnEligible = false;
      if (orderObj.currentStatus === 'Delivered' && deliveredAt) {
        const diffInDays = Math.floor((now - new Date(deliveredAt)) / (1000 * 60 * 60 * 24));
        if (diffInDays <= 30) returnEligible = true;
      }

      return {
        ...orderObj,
        products: productsWithStatus,
        totalAmount,
        deliveredAt,
        returnEligible,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({
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
      message: "New status is required",
    });
  }

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // 1. Update top-level status
    order.currentStatus = newStatus;

    // 2. Record in statusHistory (make sure array exists)
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: newStatus,
      notes: `Status changed to ${newStatus}`,
      updatedAt: new Date(),
    });

    // 3. Update each product's currentStatus
    if (order.products && order.products.length > 0) {
      order.products.forEach((product) => {
        product.currentStatus = newStatus;
      });
    }

    await order.save();

    // 4. 🔔 Trigger notification safely
    try {
      const user = await User.findById(order.userId);
      if (user && Array.isArray(user.fcmTokens) && user.fcmTokens.length > 0) {
        await sendNotification(
          user._id,
          [user.fcmTokens[user.fcmTokens.length - 1]], // latest token
          `📦 Order Update: ${newStatus}`,
          `Dear ${user.name}, your order ${order.orderId} is "${newStatus}".`
        );
      } else {
        console.log("⚠️ No FCM tokens for user, skipping notification");
      }
    } catch (notifyErr) {
      console.error("⚠️ Failed to send notification:", notifyErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      currentStatus: order.currentStatus,
    });
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating order status",
      error: error.message,
    });
  }
};


exports.toggleReturnEligibility = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { eligible } = req.body; // expects true or false

    if (typeof eligible !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid boolean value for 'eligible'.",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    order.returnEligible = eligible;
    await order.save();

    res.status(200).json({
      success: true,
      message: `Return eligibility updated successfully.`,
      orderId: order._id,
      returnEligible: order.returnEligible,
    });
  } catch (error) {
    console.error('Error updating return eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating return eligibility.',
      error: error.message,
    });
  }
};



