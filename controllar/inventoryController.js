const InventoryItem = require("../models/InventoryItem");
const QRCode = require("qrcode");
const { uploadBufferToGCS } = require("../utils/gcloud");
const { deleteFileFromGCS } = require("../utils/gcloud");

async function generateQRCode(text) {
  return await QRCode.toBuffer(text, {
    type: "png",
    width: 300,
    margin: 2
  });
}

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

    const newItem = await InventoryItem.create({
      productName,
      qty,
      numberOfBoxes,
      company,
      status,
      productImage: productImageUpload.url
    });

    // QR code should open this URL when scanned
    const qrLink = `https://threebapi-1067354145699.asia-south1.run.app/inventory/${newItem._id}`;

    const qrBuffer = await generateQRCode(qrLink);

    const qrUpload = await uploadBufferToGCS(
      qrBuffer,
      `qrcode-${newItem._id}.png`,
      "inventory_qrcodes",
      "image/png"
    );

    newItem.barcodeUrl = qrUpload.url;  // You can rename this field if needed
    newItem.barcodeId = qrUpload.id;
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

exports.getInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await InventoryItem.findById(id);

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    res.status(200).json({ data: item });
  } catch (err) {
    console.error("Get single item error:", err);
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






exports.deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await InventoryItem.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    // Delete product image (if exists)
    if (item.productImageId) {
      try {
        await deleteFileFromGCS("inventory_images", item.productImageId);
      } catch (err) {
        console.warn("Failed to delete product image:", err.message);
      }
    }

    // Delete QR code (if exists)
    if (item.barcodeId) {
      try {
        await deleteFileFromGCS("inventory_qrcodes", item.barcodeId);
      } catch (err) {
        console.warn("Failed to delete QR code:", err.message);
      }
    }

    await InventoryItem.findByIdAndDelete(id);

    res.status(200).json({
      message: "Inventory item deleted successfully",
    });

  } catch (err) {
    console.error("Delete item error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};





exports.moveInventoryStock = async (req, res) => {
  try {
    const { id } = req.params;
    let { type, toCompany, qty, numberOfBoxes } = req.body;

    // Normalize
    type = type?.toLowerCase();

    if (!type || (type !== "in" && type !== "out")) {
      return res.status(400).json({ message: "Movement type must be IN or OUT" });
    }

    qty = Number(qty);
    numberOfBoxes = Number(numberOfBoxes);

    if (!qty || !numberOfBoxes) {
      return res.status(400).json({ message: "qty and numberOfBoxes are required" });
    }

    // 1️⃣ SOURCE ITEM
    const sourceItem = await InventoryItem.findById(id);
    if (!sourceItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Ensure trackingHistory exists
    if (!sourceItem.trackingHistory) {
      sourceItem.trackingHistory = [];
    }

    // =============================
    // 🔥  OUT CASE
    // =============================
    if (type === "out") {
      if (!toCompany) {
        return res.status(400).json({ message: "toCompany is required for OUT movement" });
      }

      // Validate available stock
      if (qty > sourceItem.qty) {
        return res.status(400).json({ message: `Only ${sourceItem.qty} qty available` });
      }

      if (numberOfBoxes > sourceItem.numberOfBoxes) {
        return res.status(400).json({ message: `Only ${sourceItem.numberOfBoxes} boxes available` });
      }

      // Deduct from source
      sourceItem.qty -= qty;
      sourceItem.numberOfBoxes -= numberOfBoxes;

      // Track movement
      sourceItem.trackingHistory.push({
        type: "out",
        qty,
        numberOfBoxes,
        fromCompany: sourceItem.company,
        toCompany,
        time: new Date()
      });

      await sourceItem.save();

      // 2️⃣ ADD TO TARGET COMPANY
      let targetItem = await InventoryItem.findOne({
        productName: sourceItem.productName,
        company: toCompany
      });

      if (!targetItem) {
        // Create new stock entry
        targetItem = await InventoryItem.create({
          productName: sourceItem.productName,
          productImage: sourceItem.productImage,
          qty,
          numberOfBoxes,
          company: toCompany,
          trackingHistory: []
        });
      } else {
        // Increase stock
        targetItem.qty += qty;
        targetItem.numberOfBoxes += numberOfBoxes;
      }

      // Log IN movement into target item
      targetItem.trackingHistory.push({
        type: "in",
        qty,
        numberOfBoxes,
        fromCompany: sourceItem.company,
        toCompany,
        time: new Date()
      });

      await targetItem.save();

      return res.status(200).json({
        message: "Stock moved successfully",
        sourceItem,
        targetItem
      });
    }

    // =============================
    // 🔥  IN CASE
    // =============================
    if (type === "in") {
      sourceItem.qty += qty;
      sourceItem.numberOfBoxes += numberOfBoxes;

      sourceItem.trackingHistory.push({
        type: "in",
        qty,
        numberOfBoxes,
        fromCompany: "external",
        toCompany: sourceItem.company,
        time: new Date()
      });

      await sourceItem.save();

      return res.status(200).json({
        message: "Stock added into company",
        item: sourceItem
      });
    }

  } catch (err) {
    console.error("Move stock error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

