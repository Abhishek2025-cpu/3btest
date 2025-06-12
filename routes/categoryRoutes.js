const express = require('express');
const router = express.Router();
const categoryController = require('../controllar/categoryController');
const upload = require('../middleware/upload'); // multer config for handling file uploads

// Create category with images
router.post('/add-category', upload.array('images'), categoryController.createCategory);

// Get all categories with product counts
router.get('/all-category', categoryController.getCategories);

// Get category by ID (ObjectId)
router.get('/category/:id', categoryController.getCategoryById);

// Update a category (with optional new images and removal of some images)
router.put('/update/:id', upload.array('images'), categoryController.updateCategory);

// Delete category by ID
router.delete('/delete/:id', categoryController.deleteCategory);

// Toggle inStock status using categoryId (e.g., CAT001)
router.patch('/toggle-stock/:id', categoryController.toggleCategoryStock);

module.exports = router;
