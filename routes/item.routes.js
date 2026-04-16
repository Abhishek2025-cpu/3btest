const express = require('express');
const router = express.Router();
const multer = require('multer');

const controller = require('../controllar/item.controller');
const { checkPermission } = require('../middleware/checkPermission');

const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * 🔐 ADD ITEM
 */
router.post(
  '/add-items',
  checkPermission('products.otherProducts'),
  upload.single('productImage'),
  controller.createItemWithBoxes
);

/**
 * 🔐 UPDATE ITEM
 */
router.put(
  '/update',
  checkPermission('products.otherProducts'),
  upload.single('productImage'),
  controller.updateItemWithBoxes
);

/**
 * 🔐 SCAN BARCODE
 */
router.get(
  "/scan/:barcode",
  checkPermission('products.scanQR'),
  controller.getItemByBarcodeScan
);

/**
 * 🔐 GET ALL ITEMS
 */
router.get(
  '/get-items',
  checkPermission('products.otherProducts'),
  controller.getAllItems
);

/**
 * 🔐 GET SINGLE ITEM
 */
router.get(
  '/single/:id',
  checkPermission('products.otherProducts'),
  controller.getItemById
);

/**
 * 🔐 GET ALL ITEMS LIST
 */
router.get(
  '/get-Allitems',
  checkPermission('products.allProducts'),
  controller.getAllItemsForList
);

/**
 * 🔐 GET EMPLOYEE ASSIGNED PRODUCTS
 */
router.get(
  '/items/employee/:employeeId',
  checkPermission('products.otherProducts'),
  controller.getEmployeeAssignedProducts
);

/**
 * 🔐 GET ITEM BY ITEM NO
 */
router.get(
  '/item/:itemNo',
  checkPermission('products.otherProducts'),
  controller.getItemByItemNo
);

/**
 * 🔐 DELETE ITEM
 */
router.delete(
  '/delete-items/:id',
  checkPermission('products.otherProducts'),
  controller.deleteItem
);

/**
 * 🔐 ADD BOXES
 */
router.patch(
  '/:id/add-boxes',
  checkPermission('products.otherProducts'),
  controller.addBoxesToItem
);

/**
 * 🔐 UPDATE STOCK STATUS
 */
router.patch(
  '/update-stock-status/:id',
  checkPermission('products.otherProducts'),
  controller.updateStockStatus
);

module.exports = router;