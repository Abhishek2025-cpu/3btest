const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage for GCS uploads

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} = require('../controllar/categoryController');

// Create
router.post('/add-category', upload.array('images', 5), createCategory);

// Read
router.get('/get-category', getAllCategories);
router.get('/get-category/:id', getCategoryById);

// Update
router.put('/update/:id', upload.array('images', 5), updateCategory);

// Delete
router.delete('/delete/:id', deleteCategory);

// Toggle status
router.patch('/toggle/:id/status', toggleCategoryStatus);

module.exports = router;
