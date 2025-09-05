const HSN = require("../models/hsn");

// Add new HSN/SAC
exports.addHSN = async (req, res) => {
  try {
    const { hsnNumber, goodsName } = req.body;
    if (!hsnNumber || !goodsName) {
      return res.status(400).json({ message: "hsnNumber and goodsName are required" });
    }

    const newHSN = new HSN({ hsnNumber, goodsName });
    await newHSN.save();

    res.status(201).json({ message: "HSN added successfully", data: newHSN });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "HSN number already exists" });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all HSN/SAC
exports.getAllHSN = async (req, res) => {
  try {
    const hsnList = await HSN.find();
    res.status(200).json(hsnList);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
