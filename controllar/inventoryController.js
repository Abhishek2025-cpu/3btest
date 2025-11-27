const InventoryItem = require("../models/InventoryItem");
const bwipjs = require("bwip-js");
const { uploadBufferToGCS } = require("../utils/gcloud");

// Generate barcode buffer
async function generateBarcode(text) {
  return await bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale: 3,
    height: 12,
    includetext: true,
  });
}

// ➤ Add Item
exports.addInventoryItem = async (req, res) => {
  try {
    const { productName, qty, numberOfBoxes, company, status } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Product image required" });
    }

    // Upload product image
    const productImageUpload = await uploadBufferToGCS(
      req.file.buffer,
      req.file.originalname,
      "inventory_images",
      req.file.mimetype
    );

    // Create initial record (without barcode)
    const newItem = await InventoryItem.create({
      productName,
      qty,
      numberOfBoxes,
      company,
      status,
      productImage: productImageUpload.url
    });

    // Generate barcode link → opens stock page
    const qrTargetUrl = `https://threebapi-1067354145699.asia-south1.run.app/inventory/${newItem._id}`;

    const barcodeBuffer = await generateBarcode(qrTargetUrl);

    // Upload barcode
    const barcodeUpload = await uploadBufferToGCS(
      barcodeBuffer,
      `barcode-${newItem._id}.png`,
      "inventory_barcodes",
      "image/png"
    );

    // Update item with barcode
    newItem.barcodeUrl = barcodeUpload.url;
    newItem.barcodeId = barcodeUpload.id;
    await newItem.save();

    res.status(201).json({
      message: "Inventory item added",
      data: newItem
    });

  } catch (err) {
    console.error("Add item error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ➤ Get All Items
exports.getInventoryItems = async (req, res) => {
  try {
    const items = await InventoryItem.find().sort({ createdAt: -1 });
    res.status(200).json({ data: items });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ➤ Update Item
exports.updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    let updateData = { ...req.body };

    if (req.file) {
      const imgUpload = await uploadBufferToGCS(
        req.file.buffer,
        req.file.originalname,
        "inventory_images",
        req.file.mimetype
      );
      updateData.productImage = imgUpload.url;
    }

    const updated = await InventoryItem.findByIdAndUpdate(id, updateData, {
      new: true
    });

    if (!updated) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json({ message: "Updated successfully", data: updated });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
