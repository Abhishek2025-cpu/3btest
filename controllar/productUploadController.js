const Product = require('../models/ProductUpload');
const { uploadBufferToGCS,deleteFileFromGCS  } = require('../utils/gcloud');
const QRCode = require('qrcode');
const sharp = require('sharp');
const mongoose = require('mongoose');
const { translateResponse } = require('../services/translation.service');
const Category = require('../models/Category');
const crypto = require('crypto');
const Notification = require("../models/Notification");
const Order = require("../models/Order");
const User = require("../models/User");



// In your productUploadController.js file

const productFieldsToTranslate = [
  'name',                 // The product's name
  'about',                // The product's about section
  'materials.materialName', // A nested field inside the materials array
  'categoryId.name'       // The name of the populated category
];


async function clampPosition(requestedPosition, excludedProductId = null) {
  const filter = excludedProductId ? { _id: { $ne: excludedProductId } } : {};
  const count = await Product.countDocuments(filter);
  // If excludedProductId provided, count excludes that product (useful on update)
  const maxPos = Math.max(1, count + (excludedProductId ? 1 : 0)); // when creating, allowed max = count+1
  const n = Number(requestedPosition) || 1;
  if (n < 1) return 1;
  if (n > maxPos) return maxPos;
  return Math.floor(n);
}


async function normalizePositions(filter = {}) {
  const docs = await Product.find(filter).sort({ position: 1, updatedAt: 1 }).select('_id position').lean();
  let expected = 1;
  const bulkOps = [];

  for (const d of docs) {
    const pos = Number(d.position) || Infinity;
    if (pos !== expected) {
      bulkOps.push({
        updateOne: {
          filter: { _id: d._id },
          update: { $set: { position: expected } }
        }
      });
    }
    expected++;
  }

  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
  }
}


async function adjustPositionsForInsert(newPosition) {
  const clamped = await clampPosition(newPosition, null);
  await Product.updateMany(
    { position: { $gte: clamped } },
    { $inc: { position: 1 } }
  );
  return clamped;
}


async function adjustPositionsForUpdate(oldPosition, newPosition, excludedProductId) {
  // Ensure numeric
  oldPosition = Number(oldPosition) || 0;
  newPosition = Number(newPosition) || 0;

  // clamp newPosition based on count excluding the moving product
  const clamped = await clampPosition(newPosition, excludedProductId);

  if (clamped === oldPosition) {
    // nothing to do
    return clamped;
  }

  if (clamped > oldPosition) {
    // Moving down (e.g. 2 -> 5): decrement positions in (oldPosition, clamped] by 1
    await Product.updateMany(
      {
        _id: { $ne: excludedProductId },
        position: { $gt: oldPosition, $lte: clamped }
      },
      { $inc: { position: -1 } }
    );
  } else {
    // clamped < oldPosition => Moving up (e.g. 8 -> 3): increment positions in [clamped, oldPosition) by 1
    await Product.updateMany(
      {
        _id: { $ne: excludedProductId },
        position: { $gte: clamped, $lt: oldPosition }
      },
      { $inc: { position: 1 } }
    );
  }

  return clamped;
}





// exports.createProduct = async (req, res) => {
//   try {
//     const {
//       categoryId,
//       name,
//       about,
//       description,
//       dimensions,
//       quantity,
//       pricePerPiece,
//       totalPiecesPerBox,
//       discountPercentage
//     } = req.body;

//     const parsedPrice = Number(pricePerPiece);
//     const parsedTotal = Number(totalPiecesPerBox);
//     const parsedQty = Number(quantity) || 0;
//     const parsedDiscount = Number(discountPercentage) || 0;

//     if (!categoryId || !name || isNaN(parsedPrice) || isNaN(parsedTotal)) {
//       return res.status(400).json({ success: false, message: '❌ Required fields missing or invalid' });
//     }

//     const productImages = req.files?.images || [];
//     const colorImages = req.files?.colorImages || [];

//     // Log the number of files received by Multer
//     console.log(`Received ${productImages.length} product images and ${colorImages.length} color images.`);
//     if (productImages.length === 0 && colorImages.length === 0) {
//         // Handle case where no files are uploaded if necessary, though Multer would usually handle this if files are mandatory.
//         console.warn("No images or color images were uploaded.");
//     }


//     const uniqueFilesToUpload = new Map();
//     productImages.forEach(file => uniqueFilesToUpload.set(file.originalname, file));
//     colorImages.forEach(file => uniqueFilesToUpload.set(file.originalname, file));

//     const allUniqueFiles = Array.from(uniqueFilesToUpload.values());

//     // Log the total unique files to be processed
//     console.log(`Processing ${allUniqueFiles.length} unique image files.`);

//     const uploadPromises = allUniqueFiles.map(async (file) => {
//       try {
//         const compressedBuffer = await sharp(file.buffer)
//           .resize({ width: 1000, withoutEnlargement: true })
//           .jpeg({ quality: 80 })
//           .toBuffer();
//         const filename = `product-${Date.now()}-${file.originalname}`;
        
//         const uploadResult = await uploadBufferToGCS(compressedBuffer, filename, 'product-images');
//         const urlString = uploadResult.url;

//         return {
//           id: crypto.randomUUID(),
//           url: urlString,
//           originalname: file.originalname
//         };
//       } catch (fileError) {
//         console.error(`❌ Error processing or uploading file ${file.originalname}:`, fileError);
//         // Depending on your requirements, you might want to:
//         // 1. Re-throw to fail the entire Promise.all
//         // 2. Return a specific error object for this file and filter it out later
//         // For now, it will cause Promise.all to reject if any file fails.
//         throw fileError; 
//       }
//     });

//     const uploadedFilesData = await Promise.all(uploadPromises);
    
//     // Log successful uploads
//     console.log(`Successfully uploaded ${uploadedFilesData.length} unique files to GCS.`);

//     const urlMap = new Map();
//     uploadedFilesData.forEach(data => {
//       urlMap.set(data.originalname, { url: data.url, id: data.id });
//     });

//     const finalImagesForDB = productImages
//       .map(file => {
//         const data = urlMap.get(file.originalname);
//         if (!data) {
//             console.warn(`File ${file.originalname} was in productImages but not found in uploadedFilesData. Skipping.`);
//             return null;
//         }
//         return { id: data.id, url: data.url, originalname: file.originalname };
//       })
//       .filter(Boolean);

//     const finalColorImageMap = new Map();
//     colorImages.forEach(file => {
//       const data = urlMap.get(file.originalname);
//       if (data) {
//         finalColorImageMap.set(file.originalname, { id: data.id, url: data.url });
//       } else {
//         console.warn(`File ${file.originalname} was in colorImages but not found in uploadedFilesData. Skipping.`);
//       }
//     });

//     const mrpPerBox = parsedPrice * parsedTotal;
//     const discountedPricePerBox = parsedDiscount > 0 ? mrpPerBox - (mrpPerBox * parsedDiscount) / 100 : mrpPerBox;

//     const product = new Product({
//       categoryId, 
//       name, 
//       about,
//       description,
//       dimensions: dimensions ? dimensions.split(',').map(d => d.trim()) : [],
//       quantity: parsedQty, 
//       pricePerPiece: parsedPrice, 
//       totalPiecesPerBox: parsedTotal,
//       mrpPerBox, 
//       discountPercentage: parsedDiscount, 
//       finalPricePerBox: discountedPricePerBox,
//       images: finalImagesForDB,
//       colorImageMap: Object.fromEntries(finalColorImageMap)
//     });

//     const qrData = product._id.toString();
//     const qrBuffer = await QRCode.toBuffer(qrData);

//     const qrUploadResult = await uploadBufferToGCS(qrBuffer, `qr-${product._id}.png`, 'product-qrcodes');
//     product.qrCodeUrl = qrUploadResult.url;

//     await product.save();

//     res.status(201).json({ success: true, message: '✅ Product created successfully', product });

//   } catch (err) {
//     console.error('❌ FATAL ERROR IN createProduct:', err);
//     if (err.name === 'ValidationError') {
//       return res.status(422).json({
//         success: false, message: '❌ Validation Failed. Please check your input data.',
//         error: err.message, details: err.errors
//       });
//     }
//     // Check for specific Multer errors if any, though Multer's own error handling might intercept earlier.
//     if (err.code === 'LIMIT_UNEXPECTED_FILE') {
//         return res.status(400).json({ success: false, message: 'Too many files uploaded or unexpected file field.', error: err.message });
//     }
//     // Generic server error for other unexpected issues
//     return res.status(500).json({
//       success: false, message: '❌ An internal server error occurred.',
//       error: err.message
//     });
//   }
// };


// In your productController.js

exports.createProduct = async (req, res) => {
  try {
    const {
      categoryId,
      name,
      about,
      description,
      dimensions,
      quantity,
      pricePerPiece,
      totalPiecesPerBox,
      discountPercentage,
      position, // ← IMPORTANT: ensure this exists in req.body
      companyName   
    } = req.body;

    // 1️⃣ PARSE POSITION & CLAMP + SHIFT
    const requestedPosition = Number(position) || 1;
    const finalPosition = await adjustPositionsForInsert(requestedPosition);

    // 2️⃣ PARSE NUMBER FIELDS
    const parsedPrice = Number(pricePerPiece);
    const parsedTotal = Number(totalPiecesPerBox);
    const parsedQty = Number(quantity) || 0;
    const parsedDiscount = Number(discountPercentage) || 0;

    const productImages = req.files?.images || [];
    const colorImages = req.files?.colorImages || [];

    // Required fields
    if (!name || !description || !dimensions || productImages.length === 0 || isNaN(parsedPrice) || isNaN(parsedTotal)) {
      return res.status(400).json({
        success: false,
        message: '❌ Required fields missing or invalid.'
      });
    }

    // UPLOAD IMAGES
    const uniqueFilesToUpload = new Map();
    productImages.forEach(file => uniqueFilesToUpload.set(file.originalname, file));
    colorImages.forEach(file => uniqueFilesToUpload.set(file.originalname, file));

    const uploadPromises = [...uniqueFilesToUpload.values()].map(async (file) => {
      const compressedBuffer = await sharp(file.buffer)
        .resize({ width: 1000, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const filename = `product-${Date.now()}-${file.originalname}`;
      const uploadResult = await uploadBufferToGCS(compressedBuffer, filename, 'product-images');

      return {
        id: crypto.randomUUID(),
        url: uploadResult.url,
        originalname: file.originalname
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    const urlMap = new Map(uploadedFiles.map(f => [f.originalname, f]));

    // Format final images
    const finalImagesForDB = productImages
      .map(file => urlMap.get(file.originalname))
      .filter(Boolean);

    const finalColorImageMap = {};
    colorImages.forEach(file => {
      const data = urlMap.get(file.originalname);
      if (data) finalColorImageMap[file.originalname] = { id: data.id, url: data.url };
    });

    // PRICE CALCULATIONS
    const mrpPerBox = parsedPrice * parsedTotal;
    const finalPricePerBox =
      parsedDiscount > 0 ? mrpPerBox - (mrpPerBox * parsedDiscount) / 100 : mrpPerBox;

    // CREATE PRODUCT
    const product = new Product({
      categoryId,
      name,
      about,
      companyName, 
      description,
      dimensions: dimensions.split(',').map(d => d.trim()),
      quantity: parsedQty,
      pricePerPiece: parsedPrice,
      totalPiecesPerBox: parsedTotal,
      mrpPerBox,
      discountPercentage: parsedDiscount,
      finalPricePerBox,
      images: finalImagesForDB,
      colorImageMap: finalColorImageMap,
      position: finalPosition // 👈 Correct position after shifting
    });

    // QR Code
    const qrData = product._id.toString();
    const qrBuffer = await QRCode.toBuffer(qrData);
    const qrUploadResult = await uploadBufferToGCS(qrBuffer, `qr-${product._id}.png`, 'product-qrcodes');
    product.qrCodeUrl = qrUploadResult.url;

    await product.save();

    res.status(201).json({
      success: true,
      message: '✅ Product created successfully',
      product
    });

  } catch (err) {
    console.error('❌ FATAL ERROR IN createProduct:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      error: err.message
    });
  }
};




const axios = require("axios");

exports.getAllProducts = async (req, res) => {
  try {
    // 1️⃣ Total count
    const totalProducts = await Product.countDocuments();

    // 2️⃣ Date 15 days ago
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    // 3️⃣ Recent products
    const recentProductsDB = await Product.find({
      createdAt: { $gte: fifteenDaysAgo }
    })
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean();

    // 4️⃣ Old products
    const oldProductsDB = await Product.find({
      createdAt: { $lt: fifteenDaysAgo }
    })
      .populate("categoryId", "name")
      .sort({ position: 1 })
      .lean();

    // 5️⃣ Merge products
    let productsFromDB = [...recentProductsDB, ...oldProductsDB];

    // 6️⃣ Fetch dimensions
    const dimRes = await axios.get(
      "https://threebappbackend.onrender.com/api/dimensions/get-dimensions"
    );

    const allDimensions = Array.isArray(dimRes.data) ? dimRes.data : [];
    const dimMap = new Map(allDimensions.map(d => [d._id.toString(), d.value]));

    // ⭐ 7️⃣ Fetch ALL orders once
    const allOrders = await Order.find()
      .populate("userId", "name")
      .lean();

    // 8️⃣ Translate
    const translatedProducts = await translateResponse(
      req,
      productsFromDB,
      productFieldsToTranslate
    );

    // 9️⃣ Add dimensions + orders array
    const formattedProducts = translatedProducts.map(p => {
      const hasCategory =
        p.categoryId && typeof p.categoryId === "object" && p.categoryId.name;

      // 🔍 Find all orders containing this product
      const productOrders = [];

      allOrders.forEach(order => {
        order.products.forEach(prod => {
          if (prod.productId?.toString() === p._id.toString()) {
            productOrders.push({
              customerName: order.userId?.name || "Unknown",
              qty: prod.quantity,
              orderStatus: prod.currentStatus,
              orderDate: order.createdAt
            });
          }
        });
      });

      return {
        ...p,

        // dimension mapping
        dimensions: Array.isArray(p.dimensions)
          ? p.dimensions.map(id => dimMap.get(id?.toString()) || null)
          : [],

        // ⭐ ADD THIS (your requirement)
        orders: productOrders,

        // category fixes
        categoryName: hasCategory ? p.categoryId.name : null,
        categoryId: hasCategory ? p.categoryId._id.toString() : p.categoryId
      };
    });

    // 🔟 Response
    res.status(200).json({
      success: true,
      message: "✅ Products fetched successfully",
      totalProducts,
      recentProducts: recentProductsDB.length,
      products: formattedProducts
    });

  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({
      success: false,
      message: "❌ Failed to fetch products",
      error: err.message
    });
  }
};


exports.getSingleProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    let product;

    // 1️⃣ Try fetching by ObjectId (_id)
    if (mongoose.isValidObjectId(productId)) {
      product = await Product.findById(productId)
        .populate("categoryId", "name")
        .lean();
    }

    // 2️⃣ If not found, try fetching by custom productId field (string)
    if (!product) {
      product = await Product.findOne({ productId: productId })
        .populate("categoryId", "name")
        .lean();
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "❌ Product not found"
      });
    }

    // 3️⃣ Fetch dimensions
    const dimRes = await axios.get(
      "https://threebappbackend.onrender.com/api/dimensions/get-dimensions"
    );
    const allDimensions = Array.isArray(dimRes.data) ? dimRes.data : [];
    const dimMap = new Map(allDimensions.map(d => [d._id.toString(), d.value]));

    // 4️⃣ Fetch all orders once
    const allOrders = await Order.find()
      .populate("userId", "name")
      .lean();

    // 5️⃣ Filter orders for this product
    const productOrders = [];
    allOrders.forEach(order => {
      order.products.forEach(prod => {
        if (prod.productId?.toString() === product._id.toString()) {
          productOrders.push({
            customerName: order.userId?.name || "Unknown",
            qty: prod.quantity,
            orderStatus: prod.currentStatus,
            orderDate: order.createdAt,
            companyName: prod.company || null
          });
        }
      });
    });

    // 6️⃣ Translate fields
    const translated = await translateResponse(
      req,
      [product],
      productFieldsToTranslate
    );
    const p = translated[0];

    const hasCategory =
      p.categoryId && typeof p.categoryId === "object" && p.categoryId.name;

    // 7️⃣ Final product response
    const formattedProduct = {
      ...p,
      dimensions: Array.isArray(p.dimensions)
        ? p.dimensions.map(id => dimMap.get(id?.toString()) || id)
        : [],
      orders: productOrders,
      categoryName: hasCategory ? p.categoryId.name : null,
      categoryId: hasCategory ? p.categoryId._id.toString() : p.categoryId
    };

    return res.status(200).json({
      success: true,
      message: "✅ Product fetched successfully",
      product: formattedProduct
    });
  } catch (err) {
    console.error("❌ Error fetching product:", err);
    return res.status(500).json({
      success: false,
      message: "❌ Failed to fetch product",
      error: err.message
    });
  }
};










exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const updates = req.body;

    // Convert numeric strings
    if (updates.pricePerPiece) updates.pricePerPiece = Number(updates.pricePerPiece);
    if (updates.totalPiecesPerBox) updates.totalPiecesPerBox = Number(updates.totalPiecesPerBox);
    if (updates.discountPercentage) updates.discountPercentage = Number(updates.discountPercentage);

    // Step 1: Fetch existing product
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: '❌ Product not found' });
    }

    // -------------------------------------------------
    // ✅ POSITION UPDATE LOGIC — FINAL CORRECT VERSION
    // -------------------------------------------------
    if (updates.position !== undefined) {
      const requestedPosition = Number(updates.position);

      if (!isNaN(requestedPosition)) {
        const finalPosition = await adjustPositionsForUpdate(
          existingProduct.position,
          requestedPosition,
          existingProduct._id
        );

        existingProduct.position = finalPosition;
      }

      delete updates.position; // prevent overriding later
    }
    // -------------------------------------------------

    // Step 2: Recalculate MRP if both values provided
    if (updates.pricePerPiece && updates.totalPiecesPerBox) {
      updates.mrpPerBox = updates.pricePerPiece * updates.totalPiecesPerBox;
    }

    // Step 3: Calculate final price
    const mrp = updates.mrpPerBox || existingProduct.mrpPerBox;
    const discount =
      updates.discountPercentage !== undefined
        ? updates.discountPercentage
        : existingProduct.discountPercentage || 0;

    updates.finalPricePerBox = Math.round(mrp - (mrp * discount) / 100);

    // Step 4: Handle description
    if (updates.description) {
      if (typeof updates.description === 'object') {
        updates.description = {
          ...existingProduct.description.toObject?.() || existingProduct.description,
          ...updates.description,
        };
      } else {
        updates.description = updates.description.trim();
      }
    }

    // Step 5: Optional categoryId
    if (updates.categoryId === '' || updates.categoryId === undefined || updates.categoryId === null) {
      delete updates.categoryId;
    }

    // Step 6: Handle new images
    if (req.files?.images?.length > 0) {
      const uploadedImages = await Promise.all(
        req.files.images.map((file) =>
          uploadBufferToGCS(file.buffer, file.originalname, 'product-images')
        )
      );
      updates.images = uploadedImages;
    }

    // Step 7: Apply remaining updates
    Object.assign(existingProduct, updates);

    // SAVE updated product
    await existingProduct.save();

    res.json({
      success: true,
      message: '✅ Product updated successfully',
      product: existingProduct
    });

  } catch (err) {
    console.error('❌ Product update failed:', err);
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


exports.deleteProductImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;

    if (!productId || !imageId) {
      return res
        .status(400)
        .json({ success: false, message: "❌ Product ID and Image ID are required." });
    }

    // Step 1: Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "❌ Product not found." });
    }

    // Step 2: Find the image inside product.images
    const imageToDelete = product.images.find((img) => img.id === imageId);
    if (!imageToDelete) {
      return res
        .status(404)
        .json({ success: false, message: "❌ Image not found in this product." });
    }

    // Step 3: Remove from DB
    product.images = product.images.filter((img) => img.id !== imageId);
    await product.save();

    // Step 4: Delete from Google Cloud Storage
    try {
      // ✅ Extract filename from URL (everything after 'product-images/')
      const match = imageToDelete.url.match(/product-images\/(.+)$/);
      if (match && match[1]) {
        const gcsFilePath = `product-images/${match[1]}`;
        await deleteFileFromGCS(gcsFilePath);
        console.log(`✅ Deleted ${gcsFilePath} from GCS.`);
      } else {
        console.warn(`⚠️ Could not extract GCS path from URL: ${imageToDelete.url}`);
      }
    } catch (error) {
      console.warn(`⚠️ GCS delete failed for ${imageToDelete.url}:`, error.message);
    }

    // Step 5: Return updated list
    res.status(200).json({
      success: true,
      message: "✅ Image deleted successfully.",
      remainingImages: product.images,
    });
  } catch (err) {
    console.error("❌ Error in deleteProductImage:", err);
    res.status(500).json({
      success: false,
      message: "❌ Failed to delete image.",
      error: err.message,
    });
  }
};
