const express = require('express');
const router = express.Router();

const otherCategoryController = require('../controllar/otherCategoryController');
const { uploadProduct } = require('../middleware/upload');

const { checkPermission } = require('../middleware/checkPermission');

/**
 * 🔐 ADD OTHER CATEGORY
 */
router.post(
  '/add',
  checkPermission('categories.otherCategories'),
  uploadProduct.array('files'),
  otherCategoryController.addOtherCategory
);

/**
 * 🔐 GET ALL OTHER CATEGORIES
 */
router.get(
  '/get',
  checkPermission('categories.otherCategories'),
  otherCategoryController.getOtherCategories
);

/**
 * 🔐 GET SINGLE CATEGORY
 */
router.get(
  '/get/:id',
  checkPermission('categories.otherCategories'),
  otherCategoryController.getOtherCategoryById
);

/**
 * 🔐 UPDATE CATEGORY
 */
router.put(
  '/update/:id',
  checkPermission('categories.otherCategories'),
  uploadProduct.array('files'),
  otherCategoryController.updateOtherCategory
);

/**
 * 🔐 DELETE CATEGORY
 */
router.delete(
  '/delete/:id',
  checkPermission('categories.otherCategories'),
  otherCategoryController.deleteOtherCategory
);

/**
 * 🔐 DELETE CATEGORY IMAGES
 * ⚠️ FIXED: missing leading slash in your original code
 */
router.delete(
  '/delete/images/:id',
  checkPermission('categories.otherCategories'),
  otherCategoryController.deleteOtherCategoryImages
);

module.exports = router;