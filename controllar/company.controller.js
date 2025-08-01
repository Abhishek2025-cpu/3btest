// controllers/company.controller.js

const Company = require('../models/company');
const OtherCategory = require('../models/otherCategory'); // Import the category model
const sharp = require('sharp');
const { uploadBufferToGCS, deleteFromGCS } = require('../utils/gcloud'); // Import delete utility

const GCS_BUCKET_NAME = 'company-assets-bucket'; // Use a constant for the bucket name

// POST - Add a new company under a specific category
exports.addCompany = async (req, res) => {
  console.log("--- [DEBUG] Received request to add Company ---");
  try {
    const { name, categoryId } = req.body;

    // --- VALIDATION ---
    if (!name || !categoryId) {
      return res.status(400).json({ message: 'Company name and categoryId are required.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Company logo image is required. Use key "logo".' });
    }

    // Check if the provided category exists
    const categoryExists = await OtherCategory.findById(categoryId);
    if (!categoryExists) {
        return res.status(404).json({ message: 'The specified category was not found.' });
    }
    
    // Process and upload the logo
    console.log(`[DEBUG] Processing logo: ${req.file.originalname}`);
    const compressedBuffer = await sharp(req.file.buffer)
      .resize({ width: 400, height: 400, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ quality: 90 })
      .toBuffer();

    const fileName = `logos/company-logo-${Date.now()}-${name.replace(/\s+/g, '-')}`;
    const gcsResult = await uploadBufferToGCS(compressedBuffer, fileName, GCS_BUCKET_NAME);
    
    if (!gcsResult || !gcsResult.id || !gcsResult.url) {
        throw new Error(`GCS upload failed for company logo.`);
    }

    // --- CREATE NEW COMPANY with category reference ---
    const newCompany = new Company({
      name,
      category: categoryId, // Link to the category
      logo: { id: gcsResult.id, url: gcsResult.url }
    });

    await newCompany.save();
    
    // Populate the category details before sending the response
    await newCompany.populate('category', 'name'); 

    console.log("[DEBUG] ✅ Successfully saved new company.");
    res.status(201).json({ message: '✅ Company created successfully', company: newCompany });

  } catch (error) {
    console.error("❌ --- FATAL ERROR in addCompany --- ❌");
    if (error.code === 11000) {
        return res.status(409).json({ message: 'A company with this name already exists.' });
    }
    console.error(error);
    res.status(500).json({ message: '❌ Company creation failed', error: error.message });
  }
};

// GET - Get all companies, with optional filtering by category
exports.getAllCompanies = async (req, res) => {
    console.log("--- [DEBUG] Received request to get all Companies ---");
    try {
        const { categoryId } = req.query; // Check for a categoryId in query params
        const filter = {};

        if (categoryId) {
            filter.category = categoryId; // Add category to the filter if provided
        }

        const companies = await Company.find(filter)
            .populate('category', 'name') // POPULATE: Replaces category ID with category name
            .select('name logo category')
            .sort({ name: 1 });
        
        res.status(200).json(companies);

    } catch (error) {
        console.error("❌ --- ERROR in getAllCompanies --- ❌");
        console.error(error);
        res.status(500).json({ message: '❌ Failed to fetch companies', error: error.message });
    }
};

// --- NEW API ---
// PUT - Update a company's details, including the logo
exports.updateCompany = async (req, res) => {
    console.log(`--- [DEBUG] Received request to update Company ${req.params.id} ---`);
    try {
        const { name, categoryId } = req.body;
        const companyId = req.params.id;

        const companyToUpdate = await Company.findById(companyId);
        if (!companyToUpdate) {
            return res.status(404).json({ message: 'Company not found.' });
        }
        
        // Update name if provided
        if (name) companyToUpdate.name = name;
        
        // Update category if provided, and validate it
        if (categoryId) {
            const categoryExists = await OtherCategory.findById(categoryId);
            if (!categoryExists) {
                return res.status(404).json({ message: 'The specified category was not found.' });
            }
            companyToUpdate.category = categoryId;
        }

        // Handle logo update if a new file is uploaded
        if (req.file) {
            console.log(`[DEBUG] Updating logo for ${companyToUpdate.name}`);
            const oldLogoId = companyToUpdate.logo.id;
            
            // Process and upload new logo
            const compressedBuffer = await sharp(req.file.buffer)
                .resize({ width: 400, height: 400, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
                .png({ quality: 90 })
                .toBuffer();

            const newFileName = `logos/company-logo-${Date.now()}-${(name || companyToUpdate.name).replace(/\s+/g, '-')}`;
            const gcsResult = await uploadBufferToGCS(compressedBuffer, newFileName, GCS_BUCKET_NAME);
            
            // Update the company's logo details
            companyToUpdate.logo = { id: gcsResult.id, url: gcsResult.url };

            // Asynchronously delete the old logo from GCS
            if (oldLogoId) {
                await deleteFromGCS(oldLogoId, GCS_BUCKET_NAME);
            }
        }
        
        const updatedCompany = await companyToUpdate.save();
        await updatedCompany.populate('category', 'name');

        console.log(`[DEBUG] ✅ Successfully updated company ${companyId}.`);
        res.status(200).json({ message: '✅ Company updated successfully', company: updatedCompany });

    } catch (error) {
        console.error("❌ --- FATAL ERROR in updateCompany --- ❌");
        if (error.code === 11000) {
            return res.status(409).json({ message: 'A company with this name already exists.' });
        }
        console.error(error);
        res.status(500).json({ message: '❌ Company update failed', error: error.message });
    }
};

// --- NEW API ---
// DELETE - Delete a company
exports.deleteCompany = async (req, res) => {
    console.log(`--- [DEBUG] Received request to delete Company ${req.params.id} ---`);
    try {
        const companyId = req.params.id;
        
        // Find the company to get its logo ID for deletion from GCS
        const companyToDelete = await Company.findById(companyId);

        if (!companyToDelete) {
            return res.status(404).json({ message: 'Company not found.' });
        }

        // Delete the logo from GCS
        await deleteFromGCS(companyToDelete.logo.id, GCS_BUCKET_NAME);

        // Delete the company from the database
        await Company.findByIdAndDelete(companyId);
        
        console.log(`[DEBUG] ✅ Successfully deleted company ${companyId}.`);
        res.status(200).json({ message: '✅ Company deleted successfully' });

    } catch (error) {
        console.error("❌ --- FATAL ERROR in deleteCompany --- ❌");
        console.error(error);
        res.status(500).json({ message: '❌ Company deletion failed', error: error.message });
    }
};