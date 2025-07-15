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
        // Destructure the new companyIds field from the body
        const { productName, modelNo, size, details, materialNames, materialPrices, companyIds } = req.body;
        
        const productImages = req.files.images;
        const materialImages = req.files.materialImages;

        // ... (all previous validations for category, product details, images, materials remain the same) ...

        // --- NEW VALIDATION for companyIds ---
        let companiesArray = [];
        if (companyIds) {
            // Handle both single ID string and array of ID strings
            companiesArray = Array.isArray(companyIds) ? companyIds : [companyIds];
            // Optional: Check if all provided IDs are valid Mongo ObjectIds
            for (const id of companiesArray) {
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return res.status(400).json({ message: `Invalid Company ID format: ${id}` });
                }
            }
        }
        
        // ... (all image uploading logic remains the same) ...

        const [uploadedProductImages, uploadedMaterialImages] = await Promise.all([
            Promise.all(productImages.map(f => processAndUploadFile(f, 'product', 'products-bucket'))),
            Promise.all(materialImages.map(f => processAndUploadFile(f, 'material', 'materials-bucket')))
        ]);
        
        const materialsData = materialNames.map((name, index) => ({
            materialName: name,
            price: parseFloat(materialPrices[index]),
            materialImage: uploadedMaterialImages[index]
        }));

        // --- 5. SAVE TO DATABASE (with companies) ---
        console.log("[DEBUG] Saving product to database...");
        const newProduct = new OtherProduct({
            productName, modelNo, size, details,
            images: uploadedProductImages,
            materials: materialsData,
            category: categoryId,
            companies: companiesArray // Add the validated company IDs here
        });

        await newProduct.save();
        console.log("[DEBUG] ✅ Successfully saved new product with company associations.");

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
        // ... (error handling remains the same) ...
        console.error("❌ --- FATAL ERROR in addOtherProduct --- ❌");
        console.error(error);
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