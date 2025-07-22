// controllers/otherProduct.controller.js

const OtherProduct = require('../models/otherProduct');
const OtherCategory = require('../models/otherCategory');
const sharp = require('sharp');
const { uploadBufferToGCS } =  require('../utils/gcloud');
const mongoose = require('mongoose');

// Helper function to process and upload a single file
const processAndUploadFile = async (file, prefix, bucket) => {
    console.log(`[DEBUG] Processing file: ${file.originalname} with sharp...`);
    const compressedBuffer = await sharp(file.buffer)
        .resize({ width: 1200 })
        .jpeg({ quality: 85 })
        .toBuffer();
    
    const fileName = `${prefix}-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    console.log(`[DEBUG] Uploading to GCS as '${fileName}' in bucket '${bucket}'...`);
    
    const gcsResult = await uploadBufferToGCS(compressedBuffer, fileName, bucket);
    
    if (!gcsResult || !gcsResult.id || !gcsResult.url) {
        throw new Error(`GCS upload failed for ${file.originalname}.`);
    }
    console.log(`[DEBUG] ✅ Upload successful for ${file.originalname}`);
    return { id: gcsResult.id, url: gcsResult.url };
};


// controllers/otherProduct.controller.js

// ... (imports and helper functions like processAndUploadFile remain the same)

// exports.addOtherProduct = async (req, res) => { ...
exports.addOtherProduct = async (req, res) => {
    console.log("--- [DEBUG] Received request to add OtherProduct ---");
    try {
        // --- 1. EXTRACT DATA ---
        const { categoryId } = req.params;
        const { 
            productName, modelNo, size, details, 
            materialNames, materialPrices, materialDiscounts, 
            companyIds, // This is the ID or array of IDs from the request
            pieces      // The new pieces field
        } = req.body;
        
        const productImages = req.files.images;
        const materialImages = req.files.materialImages;

        // --- 2. VALIDATE DATA ---
        console.log("[DEBUG] Validating incoming data...");
        // (Your existing validations for files, etc.)

        const names = Array.isArray(materialNames) ? materialNames : [materialNames];
        const prices = Array.isArray(materialPrices) ? materialPrices : [materialPrices];
        const discounts = materialDiscounts ? (Array.isArray(materialDiscounts) ? materialDiscounts : [materialDiscounts]) : [];

        if (!materialImages || names.length !== materialImages.length || prices.length !== materialImages.length || (discounts.length > 0 && discounts.length !== materialImages.length)) {
            return res.status(400).json({ 
                message: `Data mismatch. The number of material names, prices, and images must be the same. If providing discounts, their count must also match.`
            });
        }
        
        // ✅ **FIX 1: Correctly process companyIds**
        let companiesArray = [];
        if (companyIds) {
            // Handle both single ID (string) and multiple IDs (array)
            companiesArray = Array.isArray(companyIds) ? companyIds : [companyIds];
        }

        // --- 3. UPLOAD IMAGES ---
        console.log("[DEBUG] Uploading all images...");
        const [uploadedProductImages, uploadedMaterialImages] = await Promise.all([
            Promise.all(productImages.map(f => processAndUploadFile(f, 'product', 'products-bucket'))),
            Promise.all(materialImages.map(f => processAndUploadFile(f, 'material', 'materials-bucket')))
        ]);
        
        // --- 4. CALCULATE PRICES & PREPARE MATERIAL DATA ---
        console.log("[DEBUG] Calculating prices and preparing material data...");
        const materialsData = names.map((name, index) => {
            const originalPrice = parseFloat(prices[index]);
            // Use || 0 as a fallback if a discount is not provided for an item
            const discountPercentage = parseFloat(discounts[index] || 0);

            if (isNaN(originalPrice)) {
                throw new Error(`Invalid price for material #${index + 1}. Please provide a number.`);
            }

            const finalPrice = originalPrice - (originalPrice * (discountPercentage / 100));

            return {
                materialName: name,
                price: originalPrice,
                discount: discountPercentage,
                discountedPrice: finalPrice,
                materialImage: uploadedMaterialImages[index]
            };
        });

        // --- 5. PREPARE FINAL DATA & SAVE TO DATABASE ---
        console.log("[DEBUG] Saving product to database...");

        // ✅ **FIX 2: Handle the 'pieces' value cleanly**
        let piecesValue = null; // Default to null
        if (pieces && pieces !== '' && !isNaN(pieces)) {
            piecesValue = Number(pieces);
        }

        const newProduct = new OtherProduct({
            productName, modelNo, size, details,
            images: uploadedProductImages,
            materials: materialsData,
            category: categoryId,
            companies: companiesArray,   // Use the populated array
            pieces: piecesValue,         // Use the cleaned-up pieces value
        });

        await newProduct.save();
        console.log("[DEBUG] ✅ Successfully saved new product.");

        const populatedProduct = await newProduct.populate([
            { path: 'category', select: 'name' },
            { path: 'companies', select: 'name logo' } // This will now work
        ]);

        res.status(201).json({
            message: '✅ Product created successfully',
            product: populatedProduct
        });

    } catch (error) {
        console.error("❌ --- FATAL ERROR in addOtherProduct --- ❌");
        console.error(error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: '❌ Product creation failed', error: error.message });
    }
};


// controllers/otherProduct.controller.js (Add this new function)

exports.getProductById = async (req, res) => {
    console.log(`--- [DEBUG] Received request to get Product by ID: ${req.params.productId} ---`);
    try {
        const { productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid Product ID format.' });
        }

        const product = await OtherProduct.findById(productId)
            .populate({ path: 'category', select: 'name' }) // Populate the category name
            .populate({ path: 'companies', select: 'name logo' }); // Populate the company name and logo

        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.status(200).json(product);

    } catch (error) {
        console.error("❌ --- ERROR in getProductById --- ❌");
        console.error(error);
        res.status(500).json({ message: '❌ Failed to fetch product', error: error.message });
    }
};


// NEW FUNCTION: GET all products for a given category ID
exports.getProductsByCategoryId = async (req, res) => {
  const { categoryId } = req.params;

  console.log(`--- [DEBUG] Fetching products for Category ID: ${categoryId} ---`);

  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: 'Invalid Category ID format.' });
    }

    // Check if the category exists
    const categoryExists = await OtherCategory.exists({ _id: categoryId });
    if (!categoryExists) {
      return res.status(404).json({ message: `Category with ID ${categoryId} not found.` });
    }

    // Find products
    const products = await OtherProduct.find({ category: categoryId })
      .populate({ path: 'companies', select: 'name logo' });

    if (!products || products.length === 0) {
      return res.status(404).json({ message: `No products found for Category ID ${categoryId}.` });
    }

    return res.status(200).json(products);

  } catch (error) {
    console.error("❌ --- ERROR in getProductsByCategoryId --- ❌");
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch products for the category', error: error.message });
  }
};



// UPDATE OtherProduct
exports.updateOtherProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid Product ID format.' });
        }

        const product = await OtherProduct.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        // Update basic fields
        const updatableFields = [
            'productName', 'modelNo', 'size', 'details', 'category', 'companies', 'pieces'
        ];
        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                product[field] = req.body[field];
            }
        });

        // Update product images if provided
        if (req.files && req.files.images) {
            const uploadedProductImages = await Promise.all(
                req.files.images.map(f => processAndUploadFile(f, 'product', 'products-bucket'))
            );
            product.images = uploadedProductImages;
        }

        // Update material images and materials if provided
        if (req.files && req.files.materialImages && req.body.materialNames && req.body.materialPrices) {
            const names = Array.isArray(req.body.materialNames) ? req.body.materialNames : [req.body.materialNames];
            const prices = Array.isArray(req.body.materialPrices) ? req.body.materialPrices : [req.body.materialPrices];
            const discounts = req.body.materialDiscounts ? (Array.isArray(req.body.materialDiscounts) ? req.body.materialDiscounts : [req.body.materialDiscounts]) : [];
            const uploadedMaterialImages = await Promise.all(
                req.files.materialImages.map(f => processAndUploadFile(f, 'material', 'materials-bucket'))
            );
            if (
                names.length !== uploadedMaterialImages.length ||
                prices.length !== uploadedMaterialImages.length ||
                (discounts.length > 0 && discounts.length !== uploadedMaterialImages.length)
            ) {
                return res.status(400).json({ message: 'Material data mismatch.' });
            }
            product.materials = names.map((name, index) => {
                const originalPrice = parseFloat(prices[index]);
                const discountPercentage = parseFloat(discounts[index] || 0);
                const finalPrice = originalPrice - (originalPrice * (discountPercentage / 100));
                return {
                    materialName: name,
                    price: originalPrice,
                    discount: discountPercentage,
                    discountedPrice: finalPrice,
                    materialImage: uploadedMaterialImages[index]
                };
            });
        }

        await product.save();
        const populatedProduct = await product.populate([
            { path: 'category', select: 'name' },
            { path: 'companies', select: 'name logo' }
        ]);
        res.status(200).json({ message: 'Product updated successfully', product: populatedProduct });
    } catch (error) {
        console.error("❌ --- ERROR in updateOtherProduct --- ❌");
        console.error(error);
        res.status(500).json({ message: 'Failed to update product', error: error.message });
    }
};


exports.deleteOtherProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid Product ID format.' });
        }
        const deleted = await OtherProduct.findByIdAndDelete(productId);
        if (!deleted) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        res.status(200).json({ message: 'Product deleted successfully.' });
    } catch (error) {
        console.error("❌ --- ERROR in deleteOtherProduct --- ❌");
        console.error(error);
        res.status(500).json({ message: 'Failed to delete product', error: error.message });
    }
};


