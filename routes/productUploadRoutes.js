const express = require('express');
const router = express.Router();

const productController = require('../controllar/productUploadController');//updated with
const { uploadProduct } = require('../middleware/upload');


router.post('/add',
  uploadProduct.fields([
    { name: 'images', maxCount: 50 },       
    { name: 'colorImages', maxCount: 50 }   
  ]),
  productController.createProduct
);

router.get('/get-movement', productController.getProductMovements);
router.get('/all', productController.getAllProducts);
router.get('/scan/:productId', productController.getProductByQr);
router.get('/:id', productController.getSingleProduct);

router.put('/update/:productId', uploadProduct.fields([
  { name: 'images', maxCount: 10 }
]), productController.updateProduct);

router.delete('/delete/:productId', productController.deleteProduct);
router.delete(
  "/products/:productId/images/:imageId",
  productController.deleteProductImage
);
router.get('/filter-sort', productController.filterAndSortProducts);

router.post(
  '/movement',
  uploadProduct.fields([
    { name: 'productImages', maxCount: 5 },
    { name: 'colorImages', maxCount: 5 }
  ]),
  productController.createProductMovement
);




module.exports = router;
