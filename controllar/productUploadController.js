const Product = require('../models/ProductUpload');
const { uploadBufferToGCS } = require('../utils/gcloud');

const crypto = require('crypto');

exports.createProduct = async (req, res) => {
  try {
    const {
      categoryId,
      name,
      about,
      dimensions,
      quantity,
      pricePerPiece,
      totalPiecesPerBox,
      discountPercentage
    } = req.body;

    const parsedPrice = Number(pricePerPiece);
    const parsedTotal = Number(totalPiecesPerBox);
    const parsedQty = Number(quantity) || 0;
    const parsedDiscount = Number(discountPercentage) || 0;

    if (!categoryId || !name || isNaN(parsedPrice) || isNaN(parsedTotal)) {
      return res.status(400).json({
        success: false,
        message: '❌ Required fields missing or invalid'
      });
    }

    const allImageFiles = req.files?.images || [];
    const colorImageFiles = req.files?.colorImages || [];

    // Upload all images
    const uploadedImages = await Promise.all(
      allImageFiles.map(async (file) => {
        const url = await uploadBufferToGCS(file.buffer, file.originalname, 'product-images');
        return {
          id: crypto.randomUUID(),
          url,
          originalname: file.originalname
        };
      })
    );

    // Build filename -> {id, url} map
    const filenameToImageMap = {};
    uploadedImages.forEach(({ id, url, originalname }) => {
      filenameToImageMap[originalname] = { id, url };
    });

    // Build colorImageMap as Map
const colorImageMap = new Map();
colorImageFiles.forEach((file) => {
  const matched = filenameToImageMap[file.originalname];
  if (matched) {
    colorImageMap.set(file.originalname, {
      id: matched.id,
      url: matched.url
    });
  }
});

    const mrpPerBox = parsedPrice * parsedTotal;
    const discountedPricePerBox =
      parsedDiscount > 0
        ? mrpPerBox - (mrpPerBox * parsedDiscount) / 100
        : mrpPerBox;

const product = new Product({
  categoryId,
  name,
  about,
  dimensions: dimensions ? dimensions.split(',') : [],
  quantity: parsedQty,
  pricePerPiece: parsedPrice,
  totalPiecesPerBox: parsedTotal,
  mrpPerBox,
  discountPercentage: parsedDiscount,
  finalPricePerBox: discountedPricePerBox,
  images: uploadedImages,
    colorImageMap: Object.fromEntries(colorImageMap)
});

    await product.save();

    res.status(201).json({
      success: true,
      message: '✅ Product created successfully',
      product
    });
  } catch (err) {
    console.error('❌ Error creating product:', err);
    res.status(500).json({
      success: false,
      message: '❌ Internal server error',
      error: err.message
    });
  }
};



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




exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const updates = req.body;

    // Convert numbers if sent as strings
    if (updates.pricePerPiece) updates.pricePerPiece = Number(updates.pricePerPiece);
    if (updates.totalPiecesPerBox) updates.totalPiecesPerBox = Number(updates.totalPiecesPerBox);
    if (updates.discountPercentage) updates.discountPercentage = Number(updates.discountPercentage);

    // Step 1: Recalculate MRP if needed
    if (updates.pricePerPiece && updates.totalPiecesPerBox) {
      updates.mrpPerBox = updates.pricePerPiece * updates.totalPiecesPerBox;
    }

    // Step 2: Fetch existing product to access previous values if needed
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: '❌ Product not found' });
    }

    // Use existing values if not present in the update body
    const mrp = updates.mrpPerBox || existingProduct.mrpPerBox;
    const discount = updates.discountPercentage !== undefined ? updates.discountPercentage : existingProduct.discountPercentage || 0;

    // Step 3: Calculate final price
    updates.finalPricePerBox = Math.round(mrp - (mrp * discount / 100));

    // Step 4: Handle image uploads if any
    if (req.files?.images?.length > 0) {
      const uploadedImages = await Promise.all(
        req.files.images.map(file =>
          uploadBufferToGCS(file.buffer, file.originalname, 'product-images')
        )
      );
      updates.images = uploadedImages;
    }

    // Step 5: Perform update
    const updated = await Product.findByIdAndUpdate(productId, updates, { new: true });

    res.json({ success: true, message: '✅ Product updated', product: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: '❌ Update failed', error: err.message });
  }
};


exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    await Product.findByIdAndDelete(productId);
    res.json({ success: true, message: '✅ Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: '❌ Deletion failed', error: err.message });
  }
};
