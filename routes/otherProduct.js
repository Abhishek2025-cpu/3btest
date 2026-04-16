const express = require('express');
const router = express.Router();
const multer = require('multer');

const otherProductController = require('../controllar/otherProduct.controller');
const { checkPermission } = require('../middleware/checkPermission');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

/**
 * 🔐 ADD OTHER PRODUCT
 */
router.post(
  '/:categoryId/products',
  checkPermission('products.otherProducts'),
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'materialImages', maxCount: 10 }
  ]),
  otherProductController.addOtherProduct
);

/**
 * 🔐 GET SINGLE PRODUCT
 */
router.get(
  '/products/:productId',
  checkPermission('products.otherProducts'),
  otherProductController.getProductById
);

/**
 * 🔐 GET PRODUCTS BY CATEGORY
 */
router.get(
  '/product/:categoryId',
  checkPermission('products.otherProducts'),
  otherProductController.getProductsByCategoryId
);

/**
 * 🔐 UPDATE PRODUCT
 */
router.put(
  '/update-product/:productId',
  checkPermission('products.otherProducts'),
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'materialImages', maxCount: 10 }
  ]),
  otherProductController.updateOtherProduct
);

/**
 * 🔐 DELETE PRODUCT
 */
router.delete(
  '/delete-product/:productId',
  checkPermission('products.otherProducts'),
  otherProductController.deleteOtherProduct
);

module.exports = router;