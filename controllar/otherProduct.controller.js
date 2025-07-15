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

exports.addOtherProduct = async (req, res) => {
    console.log("--- [DEBUG] Received request to add OtherProduct ---");
    try {
        // --- 1. EXTRACT DATA ---
        const { categoryId } = req.params;
        // Destructure the new materialDiscounts field from the body
        const { 
            productName, modelNo, size, details, 
            materialNames, materialPrices, materialDiscounts, 
            companyIds 
        } = req.body;
        
        const productImages = req.files.images;
        const materialImages = req.files.materialImages;

        // --- 2. VALIDATE DATA ---
        console.log("[DEBUG] Validating incoming data...");
        // ... (all previous validations for productName, files, etc. remain)
        
        // Convert to arrays to handle single-item submissions gracefully
        const names = Array.isArray(materialNames) ? materialNames : [materialNames];
        const prices = Array.isArray(materialPrices) ? materialPrices : [materialPrices];
        const discounts = Array.isArray(materialDiscounts) ? materialDiscounts : [materialDiscounts];
        
        if (!materialImages || names.length !== materialImages.length || prices.length !== materialImages.length || discounts.length !== materialImages.length) {
            return res.status(400).json({ 
                message: `Data mismatch. The number of material names, prices, discounts, and images must be the same.`
            });
        }
        
        let companiesArray = [];
        if (companyIds) { /* ... companyId validation remains the same ... */ }

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

            if (isNaN(originalPrice) || isNaN(discountPercentage)) {
                throw new Error(`Invalid price or discount for material #${index + 1}. Please provide numbers.`);
            }

            // Calculate the final price
            const finalPrice = originalPrice - (originalPrice * (discountPercentage / 100));

            // Return the full object to be stored in the database
            return {
                materialName: name,
                price: originalPrice,
                discount: discountPercentage,
                discountedPrice: finalPrice, // Store the calculated price
                materialImage: uploadedMaterialImages[index]
            };
        });

        // --- 5. SAVE TO DATABASE ---
        console.log("[DEBUG] Saving product to database...");
        const newProduct = new OtherProduct({
            productName, modelNo, size, details,
            images: uploadedProductImages,
            materials: materialsData,
            category: categoryId,
            companies: companiesArray
        });

        await newProduct.save();
        console.log("[DEBUG] ✅ Successfully saved new product.");

        // We can populate the response to show the created data immediately
        const populatedProduct = await newProduct.populate([
            { path: 'category', select: 'name' },
            { path: 'companies', select: 'name logo' }
        ]);

        res.status(201).json({
            message: '✅ Product created successfully',
            product: populatedProduct
        });

    } catch (error) {
        console.error("❌ --- FATAL ERROR in addOtherProduct --- ❌");
        console.error(error);
        // Check for Mongoose validation errors
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