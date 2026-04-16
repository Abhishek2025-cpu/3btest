// const express = require('express');
// const router = express.Router();
// const categoryController = require('../controllar/categoryController');

// const { uploadProduct } = require('../middleware/upload');

// router.post('/add-category', uploadProduct.array('images'), categoryController.createCategory);


// // Get all categories with product counts
// router.get('/all-category', categoryController.getCategories);

// // Get category by ID (ObjectId)
// router.get('/category/:id', categoryController.getCategoryById);

// // Update a category (with optional new images and removal of some images)
// router.put('/update/:id', uploadProduct.array('images'), categoryController.updateCategory);

// // Delete category by ID
// router.delete('/delete/:id', categoryController.deleteCategory);

// // Toggle inStock status using categoryId (e.g., CAT001)
// router.patch('/toggle-stock/:id', categoryController.toggleCategoryStock);
// // ... import your controller functions, including deleteCategoryImage

// // Route for deleting a single image from a category
// // The imageId will be URL encoded by the frontend
// router.delete('/delete/:categoryId/images/:imageId', categoryController.deleteCategoryImage);
// module.exports = router;





const express = require('express');
const router = express.Router();

const categoryController = require('../controllar/categoryController');
const { uploadProduct } = require('../middleware/upload');

const { checkPermission } = require('../middleware/checkPermission');

/**
 * 🔐 ADD CATEGORY
 */
router.post(
  '/add-category',
  checkPermission('categories.newCategory'),
  uploadProduct.array('images'),
  categoryController.createCategory
);

/**
 * 🔐 GET ALL CATEGORIES
 */
router.get(
  '/all-category',
  checkPermission('categories.allCategories'),
  categoryController.getCategories
);

/**
 * 🔐 GET CATEGORY BY ID
 */
router.get(
  '/category/:id',
  checkPermission('categories.allCategories'),
  categoryController.getCategoryById
);

/**
 * 🔐 UPDATE CATEGORY
 */
router.put(
  '/update/:id',
  checkPermission('categories.allCategories'),
  uploadProduct.array('images'),
  categoryController.updateCategory
);

/**
 * 🔐 DELETE CATEGORY
 */
router.delete(
  '/delete/:id',
  checkPermission('categories.allCategories'),
  categoryController.deleteCategory
);

/**
 * 🔐 TOGGLE STOCK
 */
router.patch(
  '/toggle-stock/:id',
  checkPermission('categories.allCategories'),
  categoryController.toggleCategoryStock
);

/**
 * 🔐 DELETE CATEGORY IMAGE
 */
router.delete(
  '/delete/:categoryId/images/:imageId',
  checkPermission('categories.otherCategories'),
  categoryController.deleteCategoryImage
);

module.exports = router;
