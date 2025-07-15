// controllers/company.controller.js

const Company = require('../models/company');
const sharp = require('sharp');
const { uploadBufferToGCS } = require('../utils/gcloud');

// POST - Add a new company
// controllers/otherProduct.controller.js (Modified addOtherProduct function)

// ... (keep processAndUploadFile helper function)

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