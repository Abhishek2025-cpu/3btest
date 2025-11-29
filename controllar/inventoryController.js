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
    const { id } = req.params; // The ID of the item passing the stock (Source)
    let { type, toCompany, qty, numberOfBoxes } = req.body;

    // 1. Normalize Inputs
    type = type?.toLowerCase();
    
    // Ensure positive numbers to prevent math errors (e.g., subtracting a negative = adding)
    qty = Math.abs(Number(qty));
    numberOfBoxes = Math.abs(Number(numberOfBoxes));

    if (!qty || !numberOfBoxes) {
      return res.status(400).json({ message: "qty and numberOfBoxes are required and must be valid numbers" });
    }

    if (!type || (type !== "in" && type !== "out")) {
      return res.status(400).json({ message: "Movement type must be IN or OUT" });
    }

    // 2. Fetch the SOURCE Item
    const sourceItem = await InventoryItem.findById(id);
    if (!sourceItem) {
      return res.status(404).json({ message: "Source Item not found" });
    }

    // Initialize tracking history if missing
    if (!sourceItem.trackingHistory) {
      sourceItem.trackingHistory = [];
    }

    // ============================================================
    // 🔥 CASE: MOVING STOCK FROM SOURCE TO ANOTHER COMPANY (OUT)
    // ACTION: SUBTRACT from Source, ADD to Target
    // ============================================================
    if (type === "out") {
      if (!toCompany) {
        return res.status(400).json({ message: "toCompany is required for moving stock (OUT)" });
      }

      // Check if Source has enough stock
      if (sourceItem.qty < qty) {
        return res.status(400).json({ 
          message: `Insufficient stock. Current Qty: ${sourceItem.qty}, Requested: ${qty}` 
        });
      }

      if (sourceItem.numberOfBoxes < numberOfBoxes) {
        return res.status(400).json({ 
          message: `Insufficient boxes. Current Boxes: ${sourceItem.numberOfBoxes}, Requested: ${numberOfBoxes}` 
        });
      }

      // ✅ SUBTRACTION OPERATION (Critical Requirement)
      sourceItem.qty = sourceItem.qty - qty;
      sourceItem.numberOfBoxes = sourceItem.numberOfBoxes - numberOfBoxes;

      // Log the movement in Source History
      sourceItem.trackingHistory.push({
        type: "out",
        qty: qty,
        numberOfBoxes: numberOfBoxes,
        fromCompany: sourceItem.company,
        toCompany: toCompany,
        timestamp: new Date() // Using timestamp to match your API response format
      });

      await sourceItem.save();

      // 3. HANDLE TARGET COMPANY (Receiver)
      let targetItem = await InventoryItem.findOne({
        productName: sourceItem.productName,
        company: toCompany
      });

      if (!targetItem) {
        // Create new item for target company if it doesn't exist
        targetItem = await InventoryItem.create({
          productName: sourceItem.productName,
          productImage: sourceItem.productImage,
          qty: qty, // Start with the moved amount
          numberOfBoxes: numberOfBoxes,
          company: toCompany,
          barcodeId: sourceItem.barcodeId, // Inherit barcode info if needed
          barcodeUrl: sourceItem.barcodeUrl,
          status: "active",
          trackingHistory: []
        });
      } else {
        // Add to existing target item
        targetItem.qty = targetItem.qty + qty;
        targetItem.numberOfBoxes = targetItem.numberOfBoxes + numberOfBoxes;
      }

      // Log the movement in Target History (It comes IN to them)
      targetItem.trackingHistory.push({
        type: "in",
        qty: qty,
        numberOfBoxes: numberOfBoxes,
        fromCompany: sourceItem.company,
        toCompany: toCompany,
        timestamp: new Date()
      });

      await targetItem.save();

      return res.status(200).json({
        message: "Stock moved successfully (Subtracted from Source, Added to Target)",
        sourceItem,
        targetItem
      });
    }

    // ============================================================
    // 🔥 CASE: ADDING NEW STOCK (IN)
    // ACTION: ADD to Source (Usually from external vendor)
    // ============================================================
    if (type === "in") {
      // ✅ ADDITION OPERATION
      sourceItem.qty = sourceItem.qty + qty;
      sourceItem.numberOfBoxes = sourceItem.numberOfBoxes + numberOfBoxes;

      sourceItem.trackingHistory.push({
        type: "in",
        qty: qty,
        numberOfBoxes: numberOfBoxes,
        fromCompany: "external", // Assuming 'in' without move logic implies external source
        toCompany: sourceItem.company,
        timestamp: new Date()
      });

      await sourceItem.save();

      return res.status(200).json({
        message: "Stock added successfully",
        data: sourceItem
      });
    }

  } catch (err) {
    console.error("Move stock error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

