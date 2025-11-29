const express = require("express");
const router = express.Router();
const inventoryController = require("../controllar/inventoryController");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

// Add item
router.post(
  "/add",
  upload.single("productImage"),
  inventoryController.addInventoryItem
);

// Get all items
router.get("/get", inventoryController.getInventoryItems);

// Update item
router.put(
  "/update/:id",
  upload.single("productImage"),
  inventoryController.updateInventoryItem
);

router.get("/single/:id", inventoryController.getInventoryItem);

router.patch("/move/:id", inventoryController.getmoveInventoryStock);




router.delete("/delete/:id", inventoryController.deleteInventoryItem);

module.exports = router;
