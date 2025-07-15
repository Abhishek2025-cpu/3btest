// routes/otherProduct.routes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const otherProductController = require('../controllar/otherProduct');

// Configure Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    // Add file size limit for security
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
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

module.exports = router;