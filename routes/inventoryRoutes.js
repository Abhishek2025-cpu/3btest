const express = require("express");
const router = express.Router();
const multer = require("multer");

const inventoryController = require("../controllar/inventoryController");
const { checkPermission } = require("../middleware/checkPermission");

const upload = multer({ storage: multer.memoryStorage() });

/**
 * 🔐 ADD INVENTORY ITEM
 */
router.post(
  "/add",
  checkPermission("products.inventory"),
  upload.single("productImage"),
  inventoryController.addInventoryItem
);

/**
 * 🔐 GET ALL INVENTORY ITEMS
 */
router.get(
  "/get",
  checkPermission("products.inventory"),
  inventoryController.getInventoryItems
);

/**
 * 🔐 GET SINGLE ITEM
 */
router.get(
  "/single/:id",
  checkPermission("products.inventory"),
  inventoryController.getInventoryItem
);

/**
 * 🔐 UPDATE INVENTORY ITEM
 */
router.put(
  "/update/:id",
  checkPermission("products.inventory"),
  upload.single("productImage"),
  inventoryController.updateInventoryItem
);

/**
 * 🔐 MOVE STOCK
 */
router.patch(
  "/move/:id",
  checkPermission("products.inventory"),
  inventoryController.moveInventoryStock
);

/**
 * 🔐 DELETE ITEM
 */
router.delete(
  "/delete/:id",
  checkPermission("products.inventory"),
  inventoryController.deleteInventoryItem
);

module.exports = router;