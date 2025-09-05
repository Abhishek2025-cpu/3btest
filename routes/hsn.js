const express = require("express");
const router = express.Router();
const { addHSN, getAllHSN } = require("../controllers/hsnController");

// POST: Add HSN
router.post("/add", addHSN);

// GET: Get all HSN
router.get("/get", getAllHSN);

module.exports = router;
