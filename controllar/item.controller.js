const mongoose = require('mongoose');
const QRCode = require('qrcode');
const MainItem = require('../models/item.model'); // IMPORTANT: Use the new MainItem model
const Employee = require('../models/Employee');
const { uploadBufferToGCS } = require('../utils/gcloud');
const Product = require('../models/ProductUpload');

// ADVANCED CREATE FUNCTION
exports.createItemWithBoxes = async (req, res) => {
  try {
    const { 
      itemNo, 
      length, 
      noOfSticks, 
      helperId, 
      operatorId, 
      shift, 
      company,
      noOfBoxes,
      machineNumber // optional
    } = req.body;

    // --- 1. Validations ---
    if (!req.file) return res.status(400).json({ error: 'Product image is required' });

    const numBoxes = parseInt(noOfBoxes, 10);
    if (isNaN(numBoxes) || numBoxes <= 0)
      return res.status(400).json({ error: 'A valid, positive number of boxes is required.' });

    // Check duplicate itemNo
    const existingItem = await MainItem.findOne({ itemNo });
    if (existingItem) return res.status(409).json({ error: `Item '${itemNo}' already exists.` });

    // --- 2. Fetch Employees and upload image ---
    const [helper, operator, productImageUpload] = await Promise.all([
      Employee.findById(helperId),
      Employee.findById(operatorId),
      uploadBufferToGCS(req.file.buffer, req.file.originalname, 'product-images', req.file.mimetype)
    ]);

    if (!helper || !operator)
      return res.status(400).json({ error: 'Invalid helperId or operatorId' });

    // --- 3. Generate Boxes ---
    const boxIndexes = Array.from({ length: numBoxes }, (_, i) => i + 1);

    const generatedBoxes = await Promise.all(
      boxIndexes.map(async (index) => {
        const boxSerialNo = String(index).padStart(3, '0');

        const qrCodeData = JSON.stringify({
          itemNo,
          boxSerialNo,
          totalBoxes: numBoxes,
          length,
          noOfSticks,
          operator: operator.name,
          helper: helper.name,
          shift,
          company,
          machineNumber: machineNumber || '',
          createdAt: new Date().toISOString()
        });

        const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
          type: 'png',
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 500
        });

        const qrCodeFileName = `qr-${itemNo}-${boxSerialNo}.png`;
        const qrCodeUpload = await uploadBufferToGCS(qrCodeBuffer, qrCodeFileName, 'qr-codes', 'image/png');

        return { boxSerialNo, qrCodeUrl: qrCodeUpload.url };
      })
    );

    // --- 4. Create MainItem ---
    const newMainItem = await MainItem.create({
      itemNo,
      length,
      noOfSticks,
      helpers: [{ _id: helper._id, name: helper.name, eid: helper.eid }],
      operators: [{ _id: operator._id, name: operator.name, eid: operator.eid }],
      shift,
      company,
      machineNumber: machineNumber ? String(machineNumber) : null,
      productImageUrl: productImageUpload.url,
      boxes: generatedBoxes,
      pendingBoxes: numBoxes,
      completedBoxes: 0
    });

    return res.status(201).json(newMainItem);

  } catch (error) {
    console.error('Create Item with Boxes Error:', error.message, error.stack);
    return res.status(500).json({ error: error.message || 'Failed to create item and its boxes' });
  }
};

exports.updateItemWithBoxes = async (req, res) => {
  try {
    const { 
      itemNo,
      length,
      noOfSticks,
      helperEid,
      operatorEid,
      shift,
      company,
      noOfBoxes // can be changed
    } = req.body;

    // 1️⃣ Find existing item
    const existingItem = await MainItem.findOne({ itemNo });
    if (!existingItem) {
      return res.status(404).json({ error: `Item with itemNo '${itemNo}' not found.` });
    }

    // 2️⃣ Fetch employees (optional update)
    const [helper, operator] = await Promise.all([
      helperEid ? Employee.findOne({ eid: helperEid }) : null,
      operatorEid ? Employee.findOne({ eid: operatorEid }) : null,
    ]);

    if (helperEid && !helper) {
      return res.status(400).json({ error: 'Invalid helper EID.' });
    }
    if (operatorEid && !operator) {
      return res.status(400).json({ error: 'Invalid operator EID.' });
    }

    // 3️⃣ Update product image if provided
    let updatedProductImageUrl = existingItem.productImageUrl;
    if (req.file) {
      const productImageUpload = await uploadBufferToGCS(
        req.file.buffer,
        req.file.originalname,
        'product-images',
        req.file.mimetype
      );
      updatedProductImageUrl = productImageUpload.url;
    }

    // 4️⃣ Determine new number of boxes
    const newBoxCount = noOfBoxes ? parseInt(noOfBoxes, 10) : existingItem.boxes.length;
    if (isNaN(newBoxCount) || newBoxCount <= 0) {
      return res.status(400).json({ error: 'Invalid number of boxes.' });
    }

    let updatedBoxes = existingItem.boxes;

    // 5️⃣ If number of boxes changed, regenerate boxes & QR codes
    if (newBoxCount !== existingItem.boxes.length) {
      const boxIndexes = Array.from({ length: newBoxCount }, (_, i) => i + 1);

      updatedBoxes = await Promise.all(
        boxIndexes.map(async (index) => {
          const boxSerialNo = String(index).padStart(3, '0');
          const qrCodeData = JSON.stringify({
            itemNo: itemNo,
            boxSerialNo,
            totalBoxes: newBoxCount,
            length: length || existingItem.length,
            noOfSticks: noOfSticks || existingItem.noOfSticks,
            operator: (operator?.name || existingItem.operator.name),
            helper: (helper?.name || existingItem.helper.name),
            shift: shift || existingItem.shift,
            company: company || existingItem.company,
            updatedAt: new Date().toISOString()
          });

          const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
            type: 'png',
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 500,
          });

          const qrCodeFileName = `qr-${itemNo}-${boxSerialNo}.png`;
          const qrCodeUpload = await uploadBufferToGCS(qrCodeBuffer, qrCodeFileName, 'qr-codes', 'image/png');

          return {
            boxSerialNo,
            qrCodeUrl: qrCodeUpload.url,
            stockStatus: 'In Stock',
          };
        })
      );
    }

    // 6️⃣ Update item details
    existingItem.length = length ?? existingItem.length;
    existingItem.noOfSticks = noOfSticks ?? existingItem.noOfSticks;
    existingItem.shift = shift ?? existingItem.shift;
    existingItem.company = company ?? existingItem.company;
    existingItem.productImageUrl = updatedProductImageUrl;
    if (helper) existingItem.helper = { _id: helper._id, name: helper.name, eid: helper.eid };
    if (operator) existingItem.operator = { _id: operator._id, name: operator.name, eid: operator.eid };
    existingItem.boxes = updatedBoxes;

    // 7️⃣ Save and respond
    await existingItem.save();

    res.status(200).json({
      message: 'Item updated successfully.',
      updatedItem: existingItem,
    });
  } catch (error) {
    console.error('Update Item Error:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Failed to update item.' });
  }
};

exports.addBoxesToItem = async (req, res) => {
  // MODIFICATION 1: We are getting 'id' from the URL, not 'itemNo'.
  const { id } = req.params; 
  const { numberOfNewBoxes } = req.body;

  try {
    // --- 1. Validation ---
    // ADDED: A crucial check to ensure the ID is a valid MongoDB ObjectId format before querying.
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid item ID format.' });
    }

    const numBoxesToAdd = parseInt(numberOfNewBoxes, 10);
    if (isNaN(numBoxesToAdd) || numBoxesToAdd <= 0) {
      return res.status(400).json({ error: 'A valid, positive number of new boxes is required.' });
    }

    // --- 2. Find the Existing Item ---
    // MODIFICATION 2: Use findById() which is faster and designed for this purpose.
    const existingItem = await MainItem.findById(id); 
    if (!existingItem) {
      // MODIFICATION 3: The error message now correctly refers to the ID.
      return res.status(404).json({ error: `Item with ID '${id}' not found.` });
    }

    // --- 3. Determine Starting Point and New Total ---
    // (This logic is correct and remains unchanged)
    const lastBoxCount = existingItem.boxes.length;
    const newTotalBoxes = lastBoxCount + numBoxesToAdd;

    // --- 4. Generate New Box Data in Parallel ---
    // (This logic is correct and remains unchanged)
    const newBoxIndexes = Array.from({ length: numBoxesToAdd }, (_, i) => i + 1);

    const generatedNewBoxes = await Promise.all(
      newBoxIndexes.map(async (index) => {
        const newSerialNumber = lastBoxCount + index;
        const boxSerialNo = String(newSerialNumber).padStart(3, '0');

        const qrCodeData = JSON.stringify({
          itemNo: existingItem.itemNo,
          boxSerialNo: boxSerialNo,
          totalBoxes: newTotalBoxes,
          length: existingItem.length,
          noOfSticks: existingItem.noOfSticks,
          operator: existingItem.operator.name,
          helper: existingItem.helper.name,
          shift: existingItem.shift,
          company: existingItem.company,
          createdAt: new Date().toISOString()
        });

        const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
          type: 'png', errorCorrectionLevel: 'H', margin: 1, width: 500,
        });

        const qrCodeFileName = `qr-${existingItem.itemNo}-${boxSerialNo}.png`;
        const qrCodeUpload = await uploadBufferToGCS(qrCodeBuffer, qrCodeFileName, 'qr-codes', 'image/png');

        return {
          _id: new mongoose.Types.ObjectId(),
          boxSerialNo: boxSerialNo,
          qrCodeUrl: qrCodeUpload.url,
          stockStatus: 'In Stock',
          createdAt: new Date(),
          updatedAt: new Date()
        };
      })
    );
    
    // --- 5. Update the MainItem with the new boxes ---
    // (This logic is correct and remains unchanged)
    await MainItem.updateOne(
      { _id: existingItem._id },
      { $push: { boxes: { $each: generatedNewBoxes } } }
    );

    // --- 6. Fetch and return the fully updated document ---
    // (This logic is correct and remains unchanged)
    const updatedItem = await MainItem.findById(existingItem._id);

    res.status(200).json({
      message: `${numBoxesToAdd} boxes added successfully.`,
      data: updatedItem
    });

  } catch (error) {
    console.error('Add Boxes to Item Error:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Failed to add boxes to the item' });
  }
};

exports.getAllItemsForList = async (req, res) => {
  try {
    const { id, name } = req.query;
    const matchStage = {};

    if (id) {
      matchStage._id = new mongoose.Types.ObjectId(id);
    } else if (name) {
      matchStage.itemNo = { $regex: new RegExp(name, "i") };
    }

    const items = await MainItem.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          boxCount: { $size: { $ifNull: ["$boxes", []] } },
          // Add this to see the lowercased itemNo that goes into the lookup
          debug_itemNoLower: { $toLower: "$itemNo" }
        }
      },
      {
        $lookup: {
          from: "productuploads",
          let: { itemNo: "$debug_itemNoLower" }, // Use the debug field
          pipeline: [
            {
              $addFields: {
                nameLower: { $toLower: "$name" }
              }
            },
            // DEBUG: Project fields here before the match to see what's being compared
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    nameLower: 1,
                    debug_itemNoFromOuter: "$$itemNo" // Bring in the itemNo from the outer pipeline
                }
            },
            // The actual match stage
            {
              $match: {
                $expr: {
                  $eq: ["$nameLower", "$$itemNo"]
                }
              }
            }
            // No need for $project after match for debugging, we want the original fields
          ],
          as: "productDetails"
        }
      },
      {
        $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          boxes: 0,
          // Keep debug fields if you want them in final output
          debug_itemNoLower: 0 // Remove from final output
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Items fetched successfully (with debug)",
      count: items.length,
      data: items.map(item => ({
        ...item,
        product: item.productDetails
          ? {
              _id: item.productDetails._id,
              name: item.productDetails.name,
              about: item.productDetails.about, // about might be missing in debug $project above
              description: item.productDetails.description
            }
          : null
      }))
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch items",
      error: error.message
    });
  }
};

// CORRECTED CODE (includes the 'boxes' array)
exports.getAllItems = async (req, res) => {
  try {
    // Fetch all items and include their full details, including the 'boxes' array.
    // The sort({ createdAt: -1 }) will show the newest items first.
    const items = await MainItem.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    console.error("Failed to fetch items:", error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

// You might want a new function to get a single item with its boxes
exports.getItemByItemNo = async (req, res) => {
  try {
    const item = await MainItem.findOne({ itemNo: req.params.itemNo });
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};


exports.deleteItem = async (req, res) => {
  try {
    const item = await MainItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};


exports.updateStockStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['In Stock', 'Out of Stock'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const item = await Item.findByIdAndUpdate(id, { status }, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    res.json(item);
  } catch (err) {
    console.error('Update stock status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

