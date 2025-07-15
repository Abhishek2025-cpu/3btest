// controllers/company.controller.js

const Company = require('../models/company');
const sharp = require('sharp');
const { uploadBufferToGCS } = require('../utils/gcloud');

// POST - Add a new company
exports.addCompany = async (req, res) => {
  console.log("--- [DEBUG] Received request to add Company ---");
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Company name is required.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Company logo image is required. Use key "logo".' });
    }
    
    // Process and upload the logo
    console.log(`[DEBUG] Processing logo: ${req.file.originalname}`);
    const compressedBuffer = await sharp(req.file.buffer)
      .resize({ width: 400, height: 400, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ quality: 90 }) // PNG for better transparency support
      .toBuffer();

    const fileName = `logos/company-logo-${Date.now()}-${name.replace(/\s+/g, '-')}`;
    const gcsResult = await uploadBufferToGCS(compressedBuffer, fileName, 'company-assets-bucket');
    
    if (!gcsResult || !gcsResult.id || !gcsResult.url) {
        throw new Error(`GCS upload failed for company logo.`);
    }

    const newCompany = new Company({
      name,
      logo: { id: gcsResult.id, url: gcsResult.url }
    });

    await newCompany.save();
    console.log("[DEBUG] ✅ Successfully saved new company.");
    res.status(201).json({ message: '✅ Company created successfully', company: newCompany });

  } catch (error) {
    console.error("❌ --- FATAL ERROR in addCompany --- ❌");
    // Handle duplicate key error nicely
    if (error.code === 11000) {
        return res.status(409).json({ message: 'A company with this name already exists.' });
    }
    console.error(error);
    res.status(500).json({ message: '❌ Company creation failed', error: error.message });
  }
};

// GET - Get all companies (for the dropdown)
exports.getAllCompanies = async (req, res) => {
    console.log("--- [DEBUG] Received request to get all Companies ---");
    try {
        // Find all companies and return only their name, logo, and id
        const companies = await Company.find().select('name logo').sort({ name: 1 });
        
        res.status(200).json(companies);

    } catch (error) {
        console.error("❌ --- ERROR in getAllCompanies --- ❌");
        console.error(error);
        res.status(500).json({ message: '❌ Failed to fetch companies', error: error.message });
    }
};