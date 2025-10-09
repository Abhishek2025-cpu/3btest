const express = require("express");
const router = express.Router();
const { uploadProduct } = require("../middleware/upload");
const { addMachine, getMachines,deleteMachine  } = require("../controllar/machineController");

// Add new machine
router.post("/add", uploadProduct.single("image"), addMachine);

// Get all machines
router.get("/get", getMachines);
router.delete("/delete/:id", deleteMachine);

module.exports = router;
