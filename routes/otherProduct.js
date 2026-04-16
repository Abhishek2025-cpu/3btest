// routes/otherProduct.routes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const otherProductController = require('../controllar/otherProduct.controller');


// Configure Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    // Add file size limit for security
    limits: { fileSize: 100 * 1024 * 1024 } // 100 MB limit
});

// Use upload.fields() to handle multiple file inputs with different names
// The 'name' must match the key used in the form-data request.
router.post(
  '/:categoryId/products', 
  upload.fields([
      { name: 'images', maxCount: 10 },        // For main product images
      { name: 'materialImages', maxCount: 10 } // For the material variant images
  ]), 
  otherProductController.addOtherProduct
);

router.get('/products/:productId', otherProductController.getProductById);

// GET /api/other-categories/:categoryId/products
router.get(
  '/product/:categoryId',
  otherProductController.getProductsByCategoryId
);

router.put(
  '/update-product/:productId',
  upload.fields([
      { name: 'images', maxCount: 10 },        // For main product images
      { name: 'materialImages', maxCount: 10 } // For the material variant images
  ]),
  otherProductController.updateOtherProduct
);

router.delete(
  '/delete-product/:productId',
  otherProductController.deleteOtherProduct
);

module.exports = router;