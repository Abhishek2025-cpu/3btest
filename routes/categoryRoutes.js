const express = require('express');
const router = express.Router();
const categoryController = require('../controllar/categoryController');

const { uploadProduct } = require('../middleware/upload');

router.post('/add-category', uploadProduct.array('images'), categoryController.createCategory);


// Get all categories with product counts
router.get('/all-category', categoryController.getCategories);

// Get category by ID (ObjectId)
router.get('/category/:id', categoryController.getCategoryById);

// Update a category (with optional new images and removal of some images)
router.put('/update/:id', uploadProduct.array('images'), categoryController.updateCategory);

// Delete category by ID
router.delete('/delete/:id', categoryController.deleteCategory);

// Toggle inStock status using categoryId (e.g., CAT001)
router.patch('/toggle-stock/:id', categoryController.toggleCategoryStock);

module.exports = router;
