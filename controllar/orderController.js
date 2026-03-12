// controllers/orderController.js
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/ProductUpload');
const OtherProduct = require('../models/otherProduct');
const Notification = require('../models/Notification');
const ReturnRequest = require('../models/ReturnRequest');

const Company = require('../models/company');
const { sendUserNotification } = require("../services/notificationService");
const axios = require('axios');



const generateOrderId = () => {
  const prefix = '#3b';
  const random = Math.floor(100000000000 + Math.random() * 900000000000); 
  return `${prefix}${random}`; // FIXED: Added backticks
};

exports.placeOrder = async (req, res) => {
  try {
    const { userId, shippingAddressId, items } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const shippingAddress = user.shippingAddresses.id(shippingAddressId);
    if (!shippingAddress)
      return res.status(404).json({ success: false, message: "Shipping address not found" });

    let totalPrice = 0;
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

        if (!product) throw new Error(`Product not found with ID: ${item.productId}`); // FIXED: Added backticks

        // STOCK UPDATE LOGIC
        if (typeof product.quantity === "number") {
          if (product.quantity < item.quantity)
            throw new Error(`Insufficient stock for product: ${product.productName || product.name}`); // FIXED: Added backticks
          
          let newQuantity = product.quantity - item.quantity;
          let updateData = { 
            quantity: newQuantity,
            available: newQuantity > 0 
          };
          
          // FIXED: Use runValidators: false to ignore the categoryId requirement during stock update
          await TargetModel.findByIdAndUpdate(
            item.productId, 
            { $set: updateData }, 
            { runValidators: false } 
          );
        }

        // IMAGE LOGIC (Ensuring it matches your Order Schema object {id, url})
        let imageObj = { id: "", url: "" };
        if (!isOtherProduct) {
          const colorKey = item.color?.trim();
          let img = (colorKey && product.colorImageMap?.[colorKey]) ? product.colorImageMap[colorKey] : (product.images?.[0] || null);
          
          if (typeof img === 'string') imageObj.url = img;
          else if (img && img.url) imageObj = { id: img.id, url: img.url };
        } else {
          let img = product.images?.[0] || product.image || null;
          if (typeof img === 'string') imageObj.url = img;
          else if (img && img.url) imageObj = { id: img.id, url: img.url };
        }

        const priceForCalculation = item.price || item.priceAtPurchase;
        if (typeof priceForCalculation !== "number") {
          throw new Error(`Price missing for product: ${item.productName || item.productId}`); // FIXED: Added backticks
        }

        const subtotal = priceForCalculation * item.quantity;
        totalPrice += subtotal;

        return {
          productId: product._id,
          productName: product.productName || product.name || "Unknown Product",
          quantity: item.quantity,
          color: item.color || "Not specified",
          priceAtPurchase: priceForCalculation,
          subtotal,
          image: imageObj,
          orderId: generateOrderId(),
        };
      })
    );

    const roundedTotalPrice = Math.round(totalPrice);

    const newOrder = new Order({
      userId,
      products,
      totalPrice: roundedTotalPrice,
      shippingDetails: {
        name: shippingAddress.name,
        phone: shippingAddress.phone,
        addressType: shippingAddress.addressType,
        detailedAddress: shippingAddress.detailedAddress,
      },
      orderId: generateOrderId(),
      currentStatus: "Pending",
      statusHistory: [{ status: "Pending", timestamp: new Date() }],
    });

    await newOrder.save();

    // Notification Logic
    try {
      await sendUserNotification(
        user,
        "🎉 Order Placed!",
        `Dear ${user.name}, your order has been placed successfully.`, // FIXED: Added backticks
        { orderId: newOrder._id.toString() }
      );
    } catch (notifError) {
      console.error("❌ Notification error ignored");
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder
    });

  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({
      success: false,
      message: error.message
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

    res.status(200).json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders,
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



