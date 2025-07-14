const express = require('express');
const router = express.Router();

// Adjust the path if your controller folder is named 'controllar'
const otherCategoryController = require('../controllers/otherCategoryController'); 

// Re-using your existing multer middleware for file uploads
const { uploadProduct } = require('../middleware/upload');

// JSDoc comments to explain each route

/**
 * @route   POST /api/other-categories
 * @desc    Add a new "Other Category" with a name and images
 * @access  Public (or Private if you add auth middleware)
 */
router.post(
  '/add', 
  uploadProduct.array('files'), // Use 'files' to match the key in Postman
  otherCategoryController.addOtherCategory
);

/**
 * @route   GET /api/other-categories
 * @desc    Get all "Other Categories"
 * @access  Public
 */
router.get(
  '/get', 
  otherCategoryController.getOtherCategories
);

/**
 * @route   GET /api/other-categories/:id
 * @desc    Get a single "Other Category" by its MongoDB _id
 * @access  Public
 */
router.get(
  '/get/:id', 
  otherCategoryController.getOtherCategoryById
);

/**
 * @route   PUT /api/other-categories/:id
 * @desc    Update a category's name and/or add new images
 * @access  Public
 */
router.put(
  '/update/:id', 
  uploadProduct.array('files'), // 'files' for adding new images
  otherCategoryController.updateOtherCategory
);

/**
 * @route   DELETE /api/other-categories/:id
 * @desc    Delete an entire "Other Category" and its images
 * @access  Public
 */
router.delete(
  '/delete/:id', 
  otherCategoryController.deleteOtherCategory
);

/**
 * @route   DELETE /api/other-categories/:id/images
 * @desc    Delete one or more specific images from a category
 * @body    { "imageIds": ["mongo_subdocument_id_1", "mongo_subdocument_id_2"] }
 * @access  Public
 */
router.delete(
  'delete/images/:id', 
  otherCategoryController.deleteOtherCategoryImages
);


module.exports = router;