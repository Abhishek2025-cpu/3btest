const OtherCategory = require('../models/otherCategory');
const sharp = require('sharp');
const mongoose = require('mongoose');
const { uploadBufferToGCS, deleteFileFromGCS } = require('../utils/gcloud'); // Ensure this path is correct

/**
 * @route   POST /api/other-categories
 * @desc    Add a new OtherCategory
 */
// In controllers/otherCategoryController.js

exports.addOtherCategory = async (req, res) => {
  console.log("--- [DEBUG] Received request to add OtherCategory ---");
  try {
    const { name } = req.body;
    console.log("[DEBUG] Category Name from request body:", name);

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // This check is crucial
    if (!req.files || req.files.length === 0) {
        console.error("[DEBUG] ERROR: req.files is empty or undefined. Check the form-data key in Postman. It must be 'files'.");
        return res.status(400).json({ message: 'At least one image is required. Make sure your form-data key is "files".' });
    }
    console.log(`[DEBUG] Received ${req.files.length} file(s). Processing...`);

    const uploadedImages = await Promise.all(
      req.files.map(async (file, index) => {
        const fileNumber = index + 1;
        console.log(`[DEBUG] File #${fileNumber}: Processing with sharp...`);
        const compressedBuffer = await sharp(file.buffer)
          .resize({ width: 1000 })
          .jpeg({ quality: 80 })
          .toBuffer();
        console.log(`[DEBUG] File #${fileNumber}: Sharp processing complete.`);

        const fileName = `other-cat-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
        
        console.log(`[DEBUG] File #${fileNumber}: Uploading to GCS as '${fileName}'...`);
        const gcsResult = await uploadBufferToGCS(compressedBuffer, fileName, 'other-categories');
        
        // This log is the most important one!
        console.log(`[DEBUG] File #${fileNumber}: Result from uploadBufferToGCS:`, gcsResult);

        // Explicitly check if the result is invalid
        if (!gcsResult || !gcsResult.id || !gcsResult.url) {
            throw new Error(`uploadBufferToGCS returned an invalid value for file #${fileNumber}. Expected { id, url }, but got: ${JSON.stringify(gcsResult)}`);
        }

        const { id, url } = gcsResult;
        return { id, url };
      })
    );
    
    console.log("[DEBUG] All images processed. Saving to database...");
    const newOtherCategory = new OtherCategory({
      name,
      images: uploadedImages,
    });

    await newOtherCategory.save();
    console.log("[DEBUG] ✅ Successfully saved to database.");

    res.status(201).json({
      message: '✅ OtherCategory created successfully',
      otherCategory: newOtherCategory
    });

  } catch (error) {
    console.error("❌ --- FATAL ERROR in addOtherCategory --- ❌");
    console.error(error); // This prints the full error stack trace
    res.status(500).json({
      message: '❌ OtherCategory creation failed',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/other-categories
 * @desc    Get all OtherCategories
 */
exports.getOtherCategories = async (req, res) => {
  try {
    const otherCategories = await OtherCategory.find().sort({ createdAt: -1 });
    res.status(200).json(otherCategories);
  } catch (error) {
    res.status(500).json({ message: '❌ Failed to fetch OtherCategories', error: error.message });
  }
};

/**
 * @route   GET /api/other-categories/:id
 * @desc    Get a single OtherCategory by its _id
 */
exports.getOtherCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const otherCategory = await OtherCategory.findById(id);
    if (!otherCategory) {
      return res.status(404).json({ message: 'OtherCategory not found' });
    }

    res.status(200).json(otherCategory);
  } catch (error) {
    res.status(500).json({ message: '❌ Failed to fetch OtherCategory', error: error.message });
  }
};

/**
 * @route   PUT /api/other-categories/:id
 * @desc    Update an OtherCategory (name and images)
 */
exports.updateOtherCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const otherCategory = await OtherCategory.findById(id);
    if (!otherCategory) {
      return res.status(404).json({ message: 'OtherCategory not found' });
    }

    // Update name if provided
    if (name) {
      otherCategory.name = name;
    }

    // Add new images if they are uploaded
    if (req.files && req.files.length > 0) {
      const newImages = await Promise.all(
        req.files.map(async (file) => {
          const compressedBuffer = await sharp(file.buffer).resize({ width: 1000 }).jpeg({ quality: 80 }).toBuffer();
          const fileName = `other-cat-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
          const { id, url } = await uploadBufferToGCS(compressedBuffer, fileName, 'other-categories');
          return { id, url };
        })
      );
      otherCategory.images.push(...newImages);
    }
    
    const updatedOtherCategory = await otherCategory.save();

    res.status(200).json({
      message: '✅ OtherCategory updated successfully',
      otherCategory: updatedOtherCategory
    });

  } catch (error) {
    res.status(500).json({ message: '❌ OtherCategory update failed', error: error.message });
  }
};

/**
 * @route   DELETE /api/other-categories/:id
 * @desc    Delete an OtherCategory and all its images from GCS
 */
exports.deleteOtherCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const otherCategory = await OtherCategory.findByIdAndDelete(id);

    if (!otherCategory) {
      return res.status(404).json({ message: 'OtherCategory not found' });
    }

    // Delete all associated images from Google Cloud Storage
    if (otherCategory.images && otherCategory.images.length > 0) {
      const deletionPromises = otherCategory.images.map(img => deleteFileFromGCS(img.id));
      await Promise.all(deletionPromises);
    }

    res.status(200).json({ message: '✅ OtherCategory and its images deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: '❌ OtherCategory deletion failed', error: error.message });
  }
};

/**
 * @route   DELETE /api/other-categories/:id/images
 * @desc    Delete multiple images from a specific OtherCategory
 * @body    { "imageIds": ["mongo_subdocument_id_1", "mongo_subdocument_id_2"] }
 */
exports.deleteOtherCategoryImages = async (req, res) => {
  try {
    const { id } = req.params; // The ID of the parent OtherCategory
    const { imageIds } = req.body; // An array of image _id's to delete

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ message: 'Image IDs must be provided as a non-empty array.' });
    }

    const otherCategory = await OtherCategory.findById(id);
    if (!otherCategory) {
        return res.status(404).json({ message: 'OtherCategory not found.' });
    }

    // Find the full image objects to get their GCS file paths (`id` field)
    const imagesToDelete = otherCategory.images.filter(img => imageIds.includes(img._id.toString()));

    if (imagesToDelete.length === 0) {
        return res.status(404).json({ message: 'None of the specified images were found in this category.' });
    }

    // 1. Delete files from Google Cloud Storage
    const gcsDeletionPromises = imagesToDelete.map(img => deleteFileFromGCS(img.id));
    await Promise.all(gcsDeletionPromises);

    // 2. Remove image references from the MongoDB document in a single operation
    const updatedCategory = await OtherCategory.findByIdAndUpdate(
        id,
        { $pull: { images: { _id: { $in: imageIds } } } },
        { new: true }
    );

    res.status(200).json({
        message: `✅ Successfully deleted ${imagesToDelete.length} image(s).`,
        otherCategory: updatedCategory,
    });

  } catch (error) {
    console.error("❌ Multiple image deletion failed:", error);
    res.status(500).json({ message: '❌ Image deletion failed', error: error.message });
  }
};