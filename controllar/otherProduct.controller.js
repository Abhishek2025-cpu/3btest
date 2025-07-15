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


exports.addOtherProduct = async (req, res) => {
    console.log("--- [DEBUG] Received request to add OtherProduct ---");
    try {
        // --- 1. EXTRACT & VALIDATE DATA ---
        const { categoryId } = req.params;
        const { productName, modelNo, size, details, materialNames, materialPrices } = req.body;
        
        // Multer puts files in req.files (as an object when using .fields())
        const productImages = req.files.images;
        const materialImages = req.files.materialImages;

        console.log("[DEBUG] Validating input...");
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ message: 'Invalid Category ID format.' });
        }
        if (!productName || !modelNo || !details || !materialNames || !materialPrices) {
            return res.status(400).json({ message: 'Missing required text fields.' });
        }
        if (!productImages || productImages.length === 0) {
            return res.status(400).json({ message: 'At least one main product image is required. Use key "images".' });
        }

        // --- 2. VALIDATE & RECONSTRUCT MATERIALS ARRAY ---
        console.log("[DEBUG] Reconstructing materials data...");
        const names = Array.isArray(materialNames) ? materialNames : [materialNames];
        const prices = Array.isArray(materialPrices) ? materialPrices : [materialPrices];

        if (!materialImages || materialImages.length === 0) {
            return res.status(400).json({ message: 'At least one material image is required. Use key "materialImages".' });
        }
        if (names.length !== prices.length || names.length !== materialImages.length) {
            return res.status(400).json({ 
                message: `Data mismatch. Received ${names.length} names, ${prices.length} prices, and ${materialImages.length} material images. All three must have the same count.`
            });
        }
        console.log(`[DEBUG] Found ${names.length} material(s) to process.`);
        
        // --- 3. UPLOAD ALL IMAGES CONCURRENTLY ---
        console.log("[DEBUG] Starting all image uploads...");

        // Create an array of all upload promises
        const productImgUploadPromises = productImages.map(file => processAndUploadFile(file, 'product', 'products-bucket'));
        const materialImgUploadPromises = materialImages.map(file => processAndUploadFile(file, 'material', 'materials-bucket'));

        // Await all uploads together
        const [uploadedProductImages, uploadedMaterialImages] = await Promise.all([
            Promise.all(productImgUploadPromises),
            Promise.all(materialImgUploadPromises)
        ]);
        console.log("[DEBUG] All image uploads completed.");

        // --- 4. ASSEMBLE FINAL DATA FOR DB ---
        const materialsData = names.map((name, index) => ({
            materialName: name,
            price: parseFloat(prices[index]), // Ensure price is a number
            materialImage: uploadedMaterialImages[index] // Map by index
        }));

        // --- 5. SAVE TO DATABASE ---
        console.log("[DEBUG] Saving product to database...");
        const newProduct = new OtherProduct({
            productName, modelNo, size, details,
            images: uploadedProductImages,
            materials: materialsData,
            category: categoryId
        });

        await newProduct.save();
        console.log("[DEBUG] ✅ Successfully saved new product to database.");

        res.status(201).json({
            message: '✅ Product created successfully',
            product: newProduct
        });

    } catch (error) {
        console.error("❌ --- FATAL ERROR in addOtherProduct --- ❌");
        console.error(error);
        res.status(500).json({ message: '❌ Product creation failed', error: error.message });
    }
};