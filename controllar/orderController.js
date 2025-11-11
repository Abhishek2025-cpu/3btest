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
  const random = Math.floor(100000000000 + Math.random() * 900000000000); // 12 digits
  return `${prefix}${random}`;
};


// exports.placeOrder = async (req, res) => {
//   try {
//     const { userId, shippingAddressId, items } = req.body;

//     // 1️⃣ Get user and shipping address
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     const shippingAddress = user.shippingAddresses.id(shippingAddressId);
//     if (!shippingAddress)
//       return res.status(404).json({ success: false, message: "Shipping address not found" });

//     // 2️⃣ Process items and calculate total
//     let totalPrice = 0;
//     const products = await Promise.all(
//       items.map(async (item) => {
//         let product = await Product.findById(item.productId);
//         let isOtherProduct = false;
//         if (!product) {
//           product = await OtherProduct.findById(item.productId);
//           isOtherProduct = true;
//         }
//         if (!product) throw new Error(`Product not found with ID: ${item.productId}`);

//         if (typeof product.quantity === "number") {
//           if (product.quantity < item.quantity)
//             throw new Error(`Insufficient stock for product: ${product.productName || product.name}`);
//           product.quantity -= item.quantity;
//           if (product.quantity <= 0) {
//             product.quantity = 0;
//             product.available = false;
//           }
//           await product.save();
//         }

//         let image = null;
//         if (!isOtherProduct) {
//           const colorKey = item.color?.trim();
//           if (colorKey && product.colorImageMap?.[colorKey]) image = product.colorImageMap[colorKey];
//           else if (product.images?.length) image = product.images[0];
//         } else {
//           image = product.images?.[0] || product.image || null;
//         }

//         const priceForCalculation = item.price || item.priceAtPurchase;
//         if (typeof priceForCalculation !== "number") {
//           throw new Error(`Price missing for product: ${item.productName || item.productId}`);
//         }

//         const subtotal = priceForCalculation * item.quantity;
//         totalPrice += subtotal;

//         return {
//           productId: product._id,
//           productName: product.productName || product.name || "Unknown Product",
//           quantity: item.quantity,
//           color: item.color || "Not specified",
//           priceAtPurchase: priceForCalculation,
//           subtotal,
//           image,
//           orderId: generateOrderId(),
//         };
//       })
//     );

//     const roundedTotalPrice = Math.round(totalPrice);

//     // 3️⃣ Save order
//     const newOrder = new Order({
//       userId,
//       products,
//       totalPrice: roundedTotalPrice,
//       shippingDetails: {
//         name: shippingAddress.name,
//         phone: shippingAddress.phone,
//         addressType: shippingAddress.addressType,
//         detailedAddress: shippingAddress.detailedAddress,
//       },
//       orderId: generateOrderId(),
//       currentStatus: "Pending",
//       tracking: [{ status: "Pending", updatedAt: new Date() }],
//     });
//     await newOrder.save();

//     // 4️⃣ Send user notification
//     try {
//       await sendUserNotification(
//         user,
//         "🎉 Order Placed!",
//         `Dear ${user.name}, your order has been placed successfully.`,
//         { orderId: newOrder._id.toString() }
//       );
//       console.log("✅ Order placement notification sent");
//     } catch (notifError) {
//       console.error("❌ Error sending notification (ignored):", notifError.message);
//     }

//     // 5️⃣ Send WhatsApp message to admin via Aicency API
//     try {
//       const apiKey = process.env.AICENCY_API_KEY; 
//       const adminPhone = process.env.ADMIN_PHONE; 

//       // Build message content
//       const productList = products
//         .map(
//           (p) =>
//             `• ${p.productName} × ${p.quantity} (${p.color}) — ₹${p.subtotal}`
//         )
//         .join("\n");

//       const message = `📦 *New Order Placed!*\n\n` +
//         `👤 Customer: ${user.name}\n` +
//         `📞 Phone: ${shippingAddress.phone}\n` +
//         `🏠 Address: ${shippingAddress.detailedAddress}\n\n` +
//         `🧾 Order ID: ${newOrder.orderId}\n` +
//         `💰 Total: ₹${roundedTotalPrice}\n\n` +
//         `🛒 Items:\n${productList}\n\n` +
//         `Check the admin panel for full details.`;

//       await axios.post("https://api.aicency.com/send-message", {
//         api_key: apiKey,
//         number: adminPhone,
//         message: message,
//       });

//       console.log("✅ WhatsApp message sent to admin via Aicency");
//     } catch (whatsappError) {
//       console.error("❌ Failed to send WhatsApp message to admin:", whatsappError.message);
//     }

//     // 6️⃣ Return success
//     res.status(201).json({
//       success: true,
//       message: "Order placed successfully",
//       order: newOrder,
//       totalPrice: roundedTotalPrice,
//       productBreakdown: products.map((p) => ({
//         productId: p.productId,
//         name: p.productName,
//         quantity: p.quantity,
//         color: p.color,
//         priceAtPurchase: p.priceAtPurchase,
//         subtotal: p.subtotal,
//       })),
//     });

//   } catch (error) {
//     console.error("❌ Error placing order:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//       error: "Server error placing order.",
//     });
//   }
// };

exports.placeOrder = async (req, res) => {
  try {
    const { userId, shippingAddressId, items } = req.body;

    // 1️⃣ Get user and shipping address
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const shippingAddress = user.shippingAddresses.id(shippingAddressId);
    if (!shippingAddress)
      return res.status(404).json({ success: false, message: "Shipping address not found" });

    // 2️⃣ Process items and calculate total
    let totalPrice = 0;
    const products = await Promise.all(
      items.map(async (item) => {
        let product = await Product.findById(item.productId);
        let isOtherProduct = false;
        if (!product) {
          product = await OtherProduct.findById(item.productId);
          isOtherProduct = true;
        }
        if (!product) throw new Error(`Product not found with ID: ${item.productId}`);

        if (typeof product.quantity === "number") {
          if (product.quantity < item.quantity)
            throw new Error(`Insufficient stock for product: ${product.productName || product.name}`);
          product.quantity -= item.quantity;
          if (product.quantity <= 0) {
            product.quantity = 0;
            product.available = false;
          }
          await product.save();
        }

        let image = null;
        if (!isOtherProduct) {
          const colorKey = item.color?.trim();
          if (colorKey && product.colorImageMap?.[colorKey]) image = product.colorImageMap[colorKey];
          else if (product.images?.length) image = product.images[0];
        } else {
          image = product.images?.[0] || product.image || null;
        }

        const priceForCalculation = item.price || item.priceAtPurchase;
        if (typeof priceForCalculation !== "number") {
          throw new Error(`Price missing for product: ${item.productName || item.productId}`);
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
          image,
          orderId: generateOrderId(),
        };
      })
    );

    const roundedTotalPrice = Math.round(totalPrice);

    // 3️⃣ Save order
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
      tracking: [{ status: "Pending", updatedAt: new Date() }],
    });
    await newOrder.save();

    // 4️⃣ Send notification using the service
    try {
      await sendUserNotification(
        user,
        "🎉 Order Placed!",
        `Dear ${user.name}, your order has been placed successfully.`,
        { orderId: newOrder._id.toString() }
      );
      console.log("✅ Order placement notification sent");
    } catch (notifError) {
      console.error("❌ Error sending notification (ignored):", notifError.message);
    }

    // 5️⃣ Return success
    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
      totalPrice: roundedTotalPrice,
      productBreakdown: products.map((p) => ({
        productId: p.productId,
        name: p.productName,
        quantity: p.quantity,
        color: p.color,
        priceAtPurchase: p.priceAtPurchase,
        subtotal: p.subtotal,
      })),
    });

  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: "Server error placing order.",
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

        // ✅ Calculate delivery date and 30-day difference
        const deliveredAt = order.deliveredAt || order.deliveredVerifiedAt || order.updatedAt;
        const deliveryDate = deliveredAt ? new Date(deliveredAt) : null;
        const diffInDays = deliveryDate ? Math.floor((now - deliveryDate) / (1000 * 60 * 60 * 24)) : null;

        // ✅ Determine return eligibility based on rules
        let isEligible = false;

        if (order.currentStatus === 'Delivered' && deliveryDate) {
          isEligible = diffInDays <= 30;
        }

        // ✅ Automatically update DB if outdated
        if (order.returnEligible !== isEligible) {
          order.returnEligible = isEligible;
          await order.save();
        }

        populatedOrder.returnEligible = isEligible;

        // ✅ Compute total
        populatedOrder.totalAmount = order.products.reduce(
          (sum, item) => sum + item.priceAtPurchase * item.quantity,
          0
        );

        // ✅ Map user
        populatedOrder.user = populatedOrder.userId;
        delete populatedOrder.userId;

        // ✅ Populate product details
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



