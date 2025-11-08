const Product = require('../models/ProductUpload');
const express = require('express');
const router = express.Router();

// Log when this router file is loaded
console.log('✅ Product test router file loaded.');

router.get('/test-product-lookup/:productName', async (req, res) => {
  console.log(`➡️  Received GET request for /test-product-lookup/${req.params.productName}`);
  try {
    const productName = req.params.productName;
    console.log(`🔍 Searching for product with name: "${productName}"`);

    // Attempt 1: Case-sensitive match
    const foundProduct = await Product.findOne({ name: productName });
    console.log(`   Result (case-sensitive): ${foundProduct ? 'Found' : 'Not Found'}`);
    if (foundProduct) {
      console.log('   Case-sensitive product details:', foundProduct);
    }

    // Attempt 2: Case-insensitive match
    const foundProductCaseInsensitive = await Product.findOne({ name: { $regex: new RegExp(productName, "i") } });
    console.log(`   Result (case-insensitive regex): ${foundProductCaseInsensitive ? 'Found' : 'Not Found'}`);
    if (foundProductCaseInsensitive) {
      console.log('   Case-insensitive product details:', foundProductCaseInsensitive);
    }

    if (foundProduct || foundProductCaseInsensitive) {
      console.log(`✅ Responding with success for "${productName}"`);
      return res.status(200).json({
        success: true,
        message: `Product(s) found for "${productName}"`,
        foundProduct: foundProduct,
        foundProductCaseInsensitive: foundProductCaseInsensitive
      });
    } else {
      console.log(`❌ Responding with 404 for "${productName}" - No product found.`);
      return res.status(404).json({
        success: false,
        message: `No product found for "${productName}"`,
      });
    }
  } catch (error) {
    console.error("⛔ Test product lookup error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during test lookup",
      error: error.message
    });
  }
});

module.exports = router;