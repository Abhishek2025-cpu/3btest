const express = require('express');
const router = express.Router();
const productController = require('../controllar/productUploadController');//updated with
const { uploadProduct } = require('../middleware/upload');

router.post('/add', uploadProduct.fields([
  { name: 'images', maxCount: 10 }
]), productController.createProduct);

router.get('/all', productController.getAllProducts);

router.put('/update/:productId', uploadProduct.fields([
  { name: 'images', maxCount: 10 }
]), productController.updateProduct);

router.delete('/delete/:productId', productController.deleteProduct);

module.exports = router;
