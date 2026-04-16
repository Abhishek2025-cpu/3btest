const express = require('express');
const router = express.Router();

const productController = require('../controllar/productUploadController');
const { uploadProduct } = require('../middleware/upload');
const { checkPermission } = require('../middleware/checkPermission');

/**
 * 🔐 SEARCH PRODUCTS
 */
router.get(
  '/search',
  checkPermission('products.allProducts'),
  productController.searchProductsByName
);

/**
 * 🔐 ADD PRODUCT
 */
router.post(
  '/add',
  checkPermission('products.allProducts'),
  uploadProduct.fields([
    { name: 'images', maxCount: 50 },
    { name: 'colorImages', maxCount: 50 }
  ]),
  productController.createProduct
);

/**
 * 🔐 GET MOVEMENTS
 */
router.get(
  '/get-movement',
  checkPermission('products.allProducts'),
  productController.getProductMovements
);

/**
 * 🔐 GET ALL PRODUCTS
 */
router.get(
  '/all',
  checkPermission('products.allProducts'),
  productController.getAllProducts
);

/**
 * 🔐 SCAN PRODUCT
 */
router.get(
  '/scan/:productId',
  checkPermission('products.scanQR'),
  productController.getProductByQr
);

/**
 * 🔐 SINGLE PRODUCT
 */
router.get(
  '/:id',
  checkPermission('products.allProducts'),
  productController.getSingleProduct
);

/**
 * 🔐 UPDATE PRODUCT
 */
router.put(
  '/update/:productId',
  checkPermission('products.allProducts'),
  uploadProduct.fields([{ name: 'images', maxCount: 10 }]),
  productController.updateProduct
);

/**
 * 🔐 DELETE PRODUCT
 */
router.delete(
  '/delete/:productId',
  checkPermission('products.allProducts'),
  productController.deleteProduct
);

/**
 * 🔐 DELETE PRODUCT IMAGE
 */
router.delete(
  '/products/:productId/images/:imageId',
  checkPermission('products.otherProducts'),
  productController.deleteProductImage
);

/**
 * 🔐 FILTER & SORT
 */
router.get(
  '/filter-sort',
  checkPermission('products.allProducts'),
  productController.filterAndSortProducts
);

/**
 * 🔐 CREATE MOVEMENT
 */
router.post(
  '/movement',
  checkPermission('products.allProducts'),
  uploadProduct.fields([
    { name: 'productImages', maxCount: 5 },
    { name: 'colorImages', maxCount: 5 }
  ]),
  productController.createProductMovement
);

module.exports = router;