const Product = require('../models/ProductUpload');
const { uploadBufferToGCS } = require('../utils/gcloud');
const QRCode = require('qrcode');
const sharp = require('sharp');
const mongoose = require('mongoose');
const { translateResponse } = require('../services/translation.service');
const Category = require('../models/Category');
const crypto = require('crypto');
const Notification = require("../models/Notification");



// In your productUploadController.js file

const productFieldsToTranslate = [
  'name',                 // The product's name
  'about',                // The product's about section
  'materials.materialName', // A nested field inside the materials array
  'categoryId.name'       // The name of the populated category
];



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
      discountPercentage
    } = req.body;

    const parsedPrice = Number(pricePerPiece);
    const parsedTotal = Number(totalPiecesPerBox);
    const parsedQty = Number(quantity) || 0;
    const parsedDiscount = Number(discountPercentage) || 0;

    const productImages = req.files?.images || [];
    const colorImages = req.files?.colorImages || [];

    // Mandatory field checks
    if (!name || !description || !dimensions || productImages.length === 0 || isNaN(parsedPrice) || isNaN(parsedTotal)) {
      return res.status(400).json({ success: false, message: '❌ Required fields missing or invalid. Description, dimensions, and at least one image are mandatory.' });
    }

    console.log(`Received ${productImages.length} product images and ${colorImages.length} color images.`);

    const uniqueFilesToUpload = new Map();
    productImages.forEach(file => uniqueFilesToUpload.set(file.originalname, file));
    colorImages.forEach(file => uniqueFilesToUpload.set(file.originalname, file));

    const allUniqueFiles = Array.from(uniqueFilesToUpload.values());

    console.log(`Processing ${allUniqueFiles.length} unique image files.`);

    const uploadPromises = allUniqueFiles.map(async (file) => {
      try {
        const compressedBuffer = await sharp(file.buffer)
          .resize({ width: 1000, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        const filename = `product-${Date.now()}-${file.originalname}`;
        
        const uploadResult = await uploadBufferToGCS(compressedBuffer, filename, 'product-images');
        const urlString = uploadResult.url;

        return {
          id: crypto.randomUUID(),
          url: urlString,
          originalname: file.originalname
        };
      } catch (fileError) {
        console.error(`❌ Error processing or uploading file ${file.originalname}:`, fileError);
        throw fileError; 
      }
    });

    const uploadedFilesData = await Promise.all(uploadPromises);
    
    console.log(`Successfully uploaded ${uploadedFilesData.length} unique files to GCS.`);

    const urlMap = new Map();
    uploadedFilesData.forEach(data => {
      urlMap.set(data.originalname, { url: data.url, id: data.id });
    });

    const finalImagesForDB = productImages
      .map(file => {
        const data = urlMap.get(file.originalname);
        if (!data) {
            console.warn(`File ${file.originalname} was in productImages but not found in uploadedFilesData. Skipping.`);
            return null;
        }
        return { id: data.id, url: data.url, originalname: file.originalname };
      })
      .filter(Boolean);

    const finalColorImageMap = new Map();
    colorImages.forEach(file => {
      const data = urlMap.get(file.originalname);
      if (data) {
        finalColorImageMap.set(file.originalname, { id: data.id, url: data.url });
      } else {
        console.warn(`File ${file.originalname} was in colorImages but not found in uploadedFilesData. Skipping.`);
      }
    });

    const mrpPerBox = parsedPrice * parsedTotal;
    const discountedPricePerBox = parsedDiscount > 0 ? mrpPerBox - (mrpPerBox * parsedDiscount) / 100 : mrpPerBox;

    const product = new Product({
      categoryId: categoryId || null,
      name, 
      about,
      description,
      dimensions: dimensions.split(',').map(d => d.trim()),
      quantity: parsedQty, 
      pricePerPiece: parsedPrice, 
      totalPiecesPerBox: parsedTotal,
      mrpPerBox, 
      discountPercentage: parsedDiscount, 
      finalPricePerBox: discountedPricePerBox,
      images: finalImagesForDB,
      colorImageMap: Object.fromEntries(finalColorImageMap)
    });

    const qrData = product._id.toString();
    const qrBuffer = await QRCode.toBuffer(qrData);

    const qrUploadResult = await uploadBufferToGCS(qrBuffer, `qr-${product._id}.png`, 'product-qrcodes');
    product.qrCodeUrl = qrUploadResult.url;

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
   if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, message: 'Too many files uploaded or unexpected file field.', error: err.message });
    }
    return res.status(500).json({
      success: false, message: '❌ An internal server error occurred.',
      error: err.message
    });
  }
};



exports.getAllProducts = async (req, res) => {
  try {
    const productsFromDB = await Product.find()
      .sort({ createdAt: -1 })
      .populate('categoryId', 'name')
      .lean(); // .lean() is good! Keep it.

    // Pass the raw data from the DB to our robust translation service
    const translatedProducts = await translateResponse(req, productsFromDB, productFieldsToTranslate);

    // Now, perform your mapping logic on the translated data
    const formattedProducts = translatedProducts.map(p => {
      // This check is still valid and important
      const hasPopulatedCategory = p.categoryId && typeof p.categoryId === 'object' && p.categoryId.name;

      return {
        ...p,
        // This will now be the translated name if ?lang=hi was used
        categoryName: hasPopulatedCategory ? p.categoryId.name : null,
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

    // Convert numeric strings
    if (updates.pricePerPiece) updates.pricePerPiece = Number(updates.pricePerPiece);
    if (updates.totalPiecesPerBox) updates.totalPiecesPerBox = Number(updates.totalPiecesPerBox);
    if (updates.discountPercentage) updates.discountPercentage = Number(updates.discountPercentage);

    // Step 1: Recalculate MRP if needed
    if (updates.pricePerPiece && updates.totalPiecesPerBox) {
      updates.mrpPerBox = updates.pricePerPiece * updates.totalPiecesPerBox;
    }

    // Step 2: Fetch existing product
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: '❌ Product not found' });
    }

    // Step 3: Calculate final price
    const mrp = updates.mrpPerBox || existingProduct.mrpPerBox;
    const discount =
      updates.discountPercentage !== undefined
        ? updates.discountPercentage
        : existingProduct.discountPercentage || 0;

    updates.finalPricePerBox = Math.round(mrp - (mrp * discount) / 100);

    // Step 4: Handle description updates
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

    // ✅ Step 5: Make categoryId optional
    // If categoryId is an empty string or undefined, don't include it in updates
    if (updates.categoryId === '' || updates.categoryId === undefined || updates.categoryId === null) {
      delete updates.categoryId;
    }

    // Step 6: Handle image uploads (if any)
    if (req.files?.images?.length > 0) {
      const uploadedImages = await Promise.all(
        req.files.images.map((file) =>
          uploadBufferToGCS(file.buffer, file.originalname, 'product-images')
        )
      );
      updates.images = uploadedImages;
    }

    // Step 7: Apply updates
    const updated = await Product.findByIdAndUpdate(productId, updates, { new: true });

    res.json({
      success: true,
      message: '✅ Product updated successfully',
      product: updated
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