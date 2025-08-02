const Product = require('../models/ProductUpload');
const { uploadBufferToGCS } = require('../utils/gcloud');
const QRCode = require('qrcode');
const sharp = require('sharp');

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

    // Compress and upload all images
    const uploadedImages = await Promise.all(
      allImageFiles.map(async (file) => {
        const compressedBuffer = await sharp(file.buffer)
          .resize({ width: 1000 }) // optional: resize
          .jpeg({ quality: 70 })   // compression level
          .toBuffer();

        const filename = `compressed-${Date.now()}-${file.originalname}`;
        const url = await uploadBufferToGCS(compressedBuffer, filename, 'product-images');

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

    // Map color images using original filenames
    const colorImageMap = new Map();

    for (const file of colorImageFiles) {
      const matched = filenameToImageMap[file.originalname];
      if (matched) {
        colorImageMap.set(file.originalname, {
          id: matched.id,
          url: matched.url
        });
      } else {
        // Optionally: compress & upload unmatched color images too
        const compressedBuffer = await sharp(file.buffer)
          .resize({ width: 1000 })
          .jpeg({ quality: 70 })
          .toBuffer();

        const filename = `compressed-${Date.now()}-${file.originalname}`;
        const url = await uploadBufferToGCS(compressedBuffer, filename, 'product-images');
        const id = crypto.randomUUID();
        colorImageMap.set(file.originalname, { id, url });
        uploadedImages.push({ id, url, originalname: file.originalname });
      }
    }

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

    // Generate and upload QR code
    const qrData = product._id.toString();
    const qrBuffer = await QRCode.toBuffer(qrData);
    const qrUrl = await uploadBufferToGCS(qrBuffer, `qr-${product._id}.png`, 'product-qrcodes');
    product.qrCodeUrl = qrUrl;

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
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .populate('categoryId', 'name') // ✅ Use 'categoryId' not 'category_id'
      .lean();

    res.status(200).json({
      success: true,
      message: '✅ Products fetched successfully',
      products
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