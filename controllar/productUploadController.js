const Product = require('../models/ProductUpload');
const { uploadBufferToGCS } = require('../utils/gcloud');

exports.createProduct = async (req, res) => {
  try {
    const {
      categoryId,
      name,
      about,
      colors,
      dimensions,
      quantity,
      pricePerPiece,
      totalPiecesPerBox,
      discountPercentage // 🎯 New field for discount
    } = req.body;

    console.log('📦 Incoming product data:', req.body);

    // Validate required fields
    if (!categoryId || !name || !pricePerPiece || !totalPiecesPerBox) {
      return res.status(400).json({
        success: false,
        message: '❌ Required fields missing: categoryId, name, pricePerPiece, or totalPiecesPerBox'
      });
    }

    const parsedPrice = Number(pricePerPiece);
    const parsedTotal = Number(totalPiecesPerBox);
    const parsedQty = Number(quantity) || 0;
    const parsedDiscount = Number(discountPercentage) || 0;

    if (isNaN(parsedPrice) || isNaN(parsedTotal)) {
      return res.status(400).json({
        success: false,
        message: '❌ pricePerPiece and totalPiecesPerBox must be valid numbers'
      });
    }

    if (parsedDiscount < 0 || parsedDiscount > 100) {
      return res.status(400).json({
        success: false,
        message: '❌ discountPercentage must be between 0 and 100'
      });
    }

    const mrpPerBox = parsedPrice * parsedTotal;
    const discountedPricePerBox = parsedDiscount > 0
      ? mrpPerBox - (mrpPerBox * parsedDiscount / 100)
      : mrpPerBox;

    const images = req.files?.images || [];

    const uploadedImages = await Promise.all(
      images.map(file => uploadBufferToGCS(file.buffer, file.originalname, 'product-images'))
    );

    const product = new Product({
      categoryId,
      name,
      about,
      colors: colors ? colors.split(',') : [],
      dimensions: dimensions ? dimensions.split(',') : [],
      quantity: parsedQty,
      pricePerPiece: parsedPrice,
      totalPiecesPerBox: parsedTotal,
      mrpPerBox,
      discountPercentage: parsedDiscount,
      finalPricePerBox: discountedPricePerBox,
      images: uploadedImages
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


exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '❌ Failed to fetch products',
      error: err.message
    });
  }
};


exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const updates = req.body;

    if (updates.pricePerPiece && updates.totalPiecesPerBox) {
      updates.mrpPerBox = updates.pricePerPiece * updates.totalPiecesPerBox;
    }

    if (req.files?.images) {
      const uploadedImages = await Promise.all(
        req.files.images.map(file =>
          uploadBufferToGCS(file.buffer, file.originalname, 'product-images')
        )
      );
      updates.images = uploadedImages;
    }

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
