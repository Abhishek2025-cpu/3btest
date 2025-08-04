const Product = require('../models/ProductUpload');
const { uploadBufferToGCS } = require('../utils/gcloud');
const QRCode = require('qrcode');
const sharp = require('sharp');
const mongoose = require('mongoose');

const Category = require('../models/Category');
const crypto = require('crypto');

// In your productUploadController.js file


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
      return res.status(400).json({ success: false, message: '❌ Required fields missing or invalid' });
    }

    const productImages = req.files?.images || [];
    const colorImages = req.files?.colorImages || [];

    const uniqueFilesToUpload = new Map();
    productImages.forEach(file => uniqueFilesToUpload.set(file.originalname, file));
    colorImages.forEach(file => uniqueFilesToUpload.set(file.originalname, file));

    const allUniqueFiles = Array.from(uniqueFilesToUpload.values());

    const uploadPromises = allUniqueFiles.map(async (file) => {
      const compressedBuffer = await sharp(file.buffer)
        .resize({ width: 1000, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      const filename = `product-${Date.now()}-${file.originalname}`;
      
      // --- START: THE FIX ---
      // The uploadBufferToGCS function returns an object. We need to get the URL string from it.
      const uploadResult = await uploadBufferToGCS(compressedBuffer, filename, 'product-images');
      const urlString = uploadResult.url; // Assuming the URL is in the 'url' property
      // --- END: THE FIX ---

      return {
        id: crypto.randomUUID(),
        url: urlString, // Assign the STRING, not the object
        originalname: file.originalname
      };
    });

    const uploadedFilesData = await Promise.all(uploadPromises);
    const urlMap = new Map();
    uploadedFilesData.forEach(data => {
      urlMap.set(data.originalname, { url: data.url, id: data.id });
    });

    const finalImagesForDB = productImages
      .map(file => {
        const data = urlMap.get(file.originalname);
        if (!data) return null;
        return { id: data.id, url: data.url, originalname: file.originalname };
      })
      .filter(Boolean);

    const finalColorImageMap = new Map();
    colorImages.forEach(file => {
      const data = urlMap.get(file.originalname);
      if (data) {
        finalColorImageMap.set(file.originalname, { id: data.id, url: data.url });
      }
    });

    const mrpPerBox = parsedPrice * parsedTotal;
    const discountedPricePerBox = parsedDiscount > 0 ? mrpPerBox - (mrpPerBox * parsedDiscount) / 100 : mrpPerBox;

    const product = new Product({
      categoryId, name, about,
      dimensions: dimensions ? dimensions.split(',').map(d => d.trim()) : [],
      quantity: parsedQty, pricePerPiece: parsedPrice, totalPiecesPerBox: parsedTotal,
      mrpPerBox, discountPercentage: parsedDiscount, finalPricePerBox: discountedPricePerBox,
      images: finalImagesForDB,
      colorImageMap: Object.fromEntries(finalColorImageMap)
    });

    const qrData = product._id.toString();
    const qrBuffer = await QRCode.toBuffer(qrData);

    // --- START: THE FIX ---
    // The same fix applies here for the QR code URL.
    const qrUploadResult = await uploadBufferToGCS(qrBuffer, `qr-${product._id}.png`, 'product-qrcodes');
    product.qrCodeUrl = qrUploadResult.url; // Assign the STRING, not the object
    // --- END: THE FIX ---

    await product.save();

    res.status(201).json({ success: true, message: '✅ Product created successfully', product });

  } catch (err) {
    console.error('❌ FATAL ERROR IN createProduct:', err);
    if (err.name === 'ValidationError') {
      return res.status(422).json({
        success: false, message: '❌ Validation Failed. Please check your input data.',
        error: err.message, details: err.errors
      });
    }
    return res.status(500).json({
      success: false, message: '❌ An internal server error occurred.',
      error: err.message
    });
  }
};



// In your productController.js




exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .populate('categoryId', 'name')
      .lean();

    const formattedProducts = products.map(p => {
      // ✅ ROBUST MAPPING LOGIC
      // Check if categoryId is an object and has a name property.
      // This is true ONLY if populate succeeded.
      const hasPopulatedCategory = p.categoryId && typeof p.categoryId === 'object' && p.categoryId.name;

      return {
        ...p,
        // If populate worked, use the name. Otherwise, explicitly set it to null.
        categoryName: hasPopulatedCategory ? p.categoryId.name : null,
        // If populate worked, get the _id. Otherwise, use the original string.
        categoryId: hasPopulatedCategory ? p.categoryId._id.toString() : p.categoryId,
      };
    });

    res.status(200).json({
      success: true,
      message: '✅ Products fetched successfully',
      products: formattedProducts
    });
  } catch (err) {
    console.error('❌ Error fetching products:', err);
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



exports.filterAndSortProducts = async (req, res) => {
  try {
    const { categoryIds, sortBy, minPrice, maxPrice } = req.query;

    const filter = {};

    // ✅ Handle multiple categories
    if (categoryIds) {
      const categoriesArray = categoryIds.split(','); // e.g., ['cat1', 'cat2']
      filter.categoryId = { $in: categoriesArray };
    }

    // ✅ Handle price range
    if (minPrice || maxPrice) {
      filter.finalPricePerBox = {};
      if (minPrice) filter.finalPricePerBox.$gte = parseFloat(minPrice);
      if (maxPrice) filter.finalPricePerBox.$lte = parseFloat(maxPrice);
    }

    // ✅ Sorting logic
    let sort = {};
    if (sortBy === 'lowToHigh') {
      sort.finalPricePerBox = 1;
    } else if (sortBy === 'highToLow') {
      sort.finalPricePerBox = -1;
    }

    const products = await Product.find(filter).sort(sort).lean();

    res.status(200).json({
      success: true,
      message: '✅ Products filtered and sorted successfully',
      products
    });
  } catch (err) {
    console.error('❌ Error filtering/sorting products:', err);
    res.status(500).json({
      success: false,
      message: '❌ Failed to filter/sort products',
      error: err.message
    });
  }
};