const mongoose = require('mongoose');
const QRCode = require('qrcode');
const MainItem = require('../models/item.model'); // IMPORTANT: Use the new MainItem model
const Employee = require('../models/Employee');
const { uploadBufferToGCS } = require('../utils/gcloud');
const Product = require('../models/ProductUpload');

// ADVANCED CREATE FUNCTION
const axios = require('axios');

/* ---------- helper to extract role eid ---------- */
function getRoleEid(employee, roleName) {
  const roleObj = employee.roles.find(r => r.role === roleName);
  if (!roleObj) {
    throw new Error(`${employee.name} does not have role ${roleName}`);
  }
  return roleObj.eid;
}

exports.createItemWithBoxes = async (req, res) => {
  try {
    const {
      itemNo,
      length,
      noOfSticks,
      mixtureId,
      helperId,
      operatorId,
      shift,
      company,
      noOfBoxes,
      machineNumber,
      mixtureMachine,
      productImageUrl,
      image
    } = req.body;

    /* ================== BASIC VALIDATION ================== */
    const cleanItemNo = itemNo?.trim();
    if (!cleanItemNo) {
      return res.status(400).json({ error: 'Item No is required' });
    }

    const numBoxes = parseInt(noOfBoxes, 10);
    if (!numBoxes || numBoxes <= 0) {
      return res.status(400).json({
        error: 'A valid, positive number of boxes is required.'
      });
    }

    const finalImageUrl = productImageUrl || image;
    if (!req.file && !finalImageUrl) {
      return res.status(400).json({ error: 'Product image is required' });
    }

    /* ================== FETCH EMPLOYEES ================== */
    const [helper, operator, mixture] = await Promise.all([
      Employee.findById(helperId),
      Employee.findById(operatorId),
      Employee.findById(mixtureId)
    ]);

    if (!helper || !operator || !mixture) {
      return res.status(400).json({
        error: 'Invalid helperId, operatorId, or mixtureId'
      });
    }

    /* ================== IMAGE HANDLING ================== */
    let productImageUpload;

    if (req.file) {
      productImageUpload = await uploadBufferToGCS(
        req.file.buffer,
        req.file.originalname,
        'product-images',
        req.file.mimetype
      );
    } else {
      const imageResponse = await axios.get(finalImageUrl, {
        responseType: 'arraybuffer'
      });

      productImageUpload = await uploadBufferToGCS(
        Buffer.from(imageResponse.data),
        `product-${cleanItemNo}-${Date.now()}.jpg`,
        'product-images',
        imageResponse.headers['content-type'] || 'image/jpeg'
      );
    }

    /* ================== GENERATE BOXES ================== */
    const generatedBoxes = await Promise.all(
      Array.from({ length: numBoxes }, async (_, i) => {
        const boxSerialNo = String(i + 1).padStart(3, '0');

        const qrData = JSON.stringify({
          itemNo: cleanItemNo,
          boxSerialNo,
          totalBoxes: numBoxes,
          length,
          noOfSticks,
          shift,
          company,
          machineNumber: machineNumber || '',
          mixtureMachine: mixtureMachine || '',
          createdAt: new Date().toISOString()
        });

        const qrBuffer = await QRCode.toBuffer(qrData, { width: 500 });

        const qrUpload = await uploadBufferToGCS(
          qrBuffer,
          `qr-${cleanItemNo}-${boxSerialNo}.png`,
          'qr-codes',
          'image/png'
        );

        return {
          boxSerialNo,
          qrCodeUrl: qrUpload.url
        };
      })
    );

    /* ================== CREATE ITEM ================== */
    const newMainItem = await MainItem.create({
      itemNo: cleanItemNo,
      length,
      noOfSticks,

      helpers: [
        {
          employeeId: helper._id,
          role: 'helper',
          roleEid: getRoleEid(helper, 'helper')
        }
      ],
      operators: [
        {
          employeeId: operator._id,
          role: 'operator',
          roleEid: getRoleEid(operator, 'operator')
        }
      ],
      mixtures: [
        {
          employeeId: mixture._id,
          role: 'mixture',
          roleEid: getRoleEid(mixture, 'mixture')
        }
      ],

      shift,
      company,
      machineNumber: machineNumber || null,
      mixtureMachine: mixtureMachine || null,
      productImageUrl: productImageUpload.url,
      boxes: generatedBoxes,
      pendingBoxes: numBoxes,
      completedBoxes: 0
    });

    return res.status(201).json(newMainItem);

  } catch (error) {
    console.error('Create Item with Boxes Error:', error.message);
    return res.status(500).json({
      error: error.message || 'Failed to create item and its boxes'
    });
  }
};

// exports.createItemWithBoxes = async (req, res) => {
//   try {
//     const { 
//       itemNo, 
//       length, 
//       noOfSticks,
//       mixtureId,     
//       helperId, 
//       operatorId, 
//       shift, 
//       company,
//       noOfBoxes,
//       machineNumber,
//       mixtureMachine  
//     } = req.body;

//     // === FIX: FORCE REMOVE EXTRA SPACES ===
//     const cleanItemNo = itemNo ? itemNo.trim() : "";
//     if (!cleanItemNo)
//       return res.status(400).json({ error: "Item No is required" });

//     // --- 1. Validations ---
//     if (!req.file) return res.status(400).json({ error: 'Product image is required' });

//     const numBoxes = parseInt(noOfBoxes, 10);
//     if (isNaN(numBoxes) || numBoxes <= 0)
//       return res.status(400).json({ error: 'A valid, positive number of boxes is required.' });

//     // --- 2. Fetch Employees + Upload Image ---
//     const [helper, operator, mixture, productImageUpload] = await Promise.all([
//       Employee.findById(helperId),
//       Employee.findById(operatorId),
//       Employee.findById(mixtureId),
//       uploadBufferToGCS(
//         req.file.buffer,
//         req.file.originalname,
//         'product-images',
//         req.file.mimetype
//       )
//     ]);

//     if (!helper || !operator || !mixture)
//       return res.status(400).json({ error: 'Invalid helperId, operatorId, or mixtureId' });

//     // --- 3. Generate Boxes ---
//     const boxIndexes = Array.from({ length: numBoxes }, (_, i) => i + 1);

//     const generatedBoxes = await Promise.all(
//       boxIndexes.map(async (index) => {
//         const boxSerialNo = String(index).padStart(3, '0');

//         const qrCodeData = JSON.stringify({
//           itemNo: cleanItemNo,
//           boxSerialNo,
//           totalBoxes: numBoxes,
//           length,
//           noOfSticks,
//           operator: operator.name,
//           helper: helper.name,
//           mixture: mixture.name,
//           shift,
//           company,
//           machineNumber: machineNumber || '',
//           mixtureMachine: mixtureMachine || '',
//           createdAt: new Date().toISOString()
//         });

//         const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
//           type: 'png',
//           errorCorrectionLevel: 'H',
//           margin: 1,
//           width: 500
//         });

//         const qrCodeFileName = `qr-${cleanItemNo}-${boxSerialNo}.png`;
//         const qrCodeUpload = await uploadBufferToGCS(
//           qrCodeBuffer,
//           qrCodeFileName,
//           'qr-codes',
//           'image/png'
//         );

//         return { boxSerialNo, qrCodeUrl: qrCodeUpload.url };
//       })
//     );

//     // --- 4. Create Main Item ---
//     const newMainItem = await MainItem.create({
//       itemNo: cleanItemNo,
//       length,
//       noOfSticks,
//       helpers: [{ _id: helper._id, name: helper.name, eid: helper.eid }],
//       mixtures: [{ _id: mixture._id, name: mixture.name, eid: mixture.eid }],
//       operators: [{ _id: operator._id, name: operator.name, eid: operator.eid }],
//       shift,
//       company,
//       machineNumber: machineNumber ? String(machineNumber) : null,
//       mixtureMachine: mixtureMachine ? String(mixtureMachine) : null,
//       productImageUrl: productImageUpload.url,
//       boxes: generatedBoxes,
//       pendingBoxes: numBoxes,
//       completedBoxes: 0
//     });

//     return res.status(201).json(newMainItem);

//   } catch (error) {
//     console.error('Create Item with Boxes Error:', error.message, error.stack);
//     return res.status(500).json({ error: error.message || 'Failed to create item and its boxes' });
//   }
// };


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

      // Add box count + trimmed/lower itemNo for accurate matching
      {
        $addFields: {
          boxCount: { $size: { $ifNull: ["$boxes", []] } },
          itemNoTrimLower: {
            $toLower: { $trim: { input: "$itemNo" } }
          }
        }
      },

      // --- 🔍 FIXED LOOKUP: TRIM + LOWERCASE ON BOTH SIDES ---
      {
        $lookup: {
          from: "productuploads",
          let: { itemNoClean: "$itemNoTrimLower" },
          pipeline: [
            {
              $addFields: {
                nameTrimLower: {
                  $toLower: { $trim: { input: "$name" } }
                }
              }
            },
            {
              $match: {
                $expr: {
                  $eq: ["$nameTrimLower", "$$itemNoClean"]
                }
              }
            },
            {
              $project: {
                _id: 1,
                name: 1,
                description: 1,
                about: 1
              }
            }
          ],
          as: "productDetails"
        }
      },

      { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          boxes: 0,
          itemNoTrimLower: 0
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Items fetched successfully",
      count: items.length,
      data: items.map(item => ({
        ...item,
        product: item.productDetails
          ? {
              _id: item.productDetails._id,
              name: item.productDetails.name,
              about: item.productDetails.about,
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




// ... your existing exports.getAllItemsForList function ...

exports.getEmployeeAssignedProducts = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Employee ID format."
      });
    }

    const items = await MainItem.aggregate([
      // Match MainItems that include the employee
      {
        $match: {
          $or: [
            { "helpers._id": new mongoose.Types.ObjectId(employeeId) },
            { "operators._id": new mongoose.Types.ObjectId(employeeId) },
            { "mixtures._id": new mongoose.Types.ObjectId(employeeId) }
          ]
        }
      },

      { $sort: { createdAt: -1 } },

      // Add boxCount
      {
        $addFields: {
          boxCount: { $size: { $ifNull: ["$boxes", []] } }
        }
      },

      // Lookup product by itemNo = product.name (case-insensitive)
      {
        $lookup: {
          from: "productuploads",
          let: {
            itemNoLower: {
              $toLower: { $trim: { input: "$itemNo" } }
            }
          },
          pipeline: [
            {
              $addFields: {
                nameLower: {
                  $toLower: { $trim: { input: "$name" } }
                }
              }
            },
            {
              $match: {
                $expr: { $eq: ["$nameLower", "$$itemNoLower"] }
              }
            },
            {
              $project: {
                _id: 1,
                name: 1,
                about: 1,
                description: 1,
                productImageUrl: 1
              }
            }
          ],
          as: "productDetails"
        }
      },

      // Lookup operator machine
      {
        $lookup: {
          from: "machines",
          let: { machineNum: { $trim: { input: "$machineNumber" } } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $regexMatch: {
                    input: { $toLower: "$name" },
                    regex: { $toLower: "$$machineNum" }
                  }
                }
              }
            },
            {
              $project: { _id: 1, name: 1, companyName: 1, type: 1 }
            }
          ],
          as: "machineDetails"
        }
      },

      // Lookup mixture machine
      {
        $lookup: {
          from: "machines",
          let: { mixMachineNum: { $trim: { input: "$mixtureMachine" } } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $regexMatch: {
                    input: { $toLower: "$name" },
                    regex: { $toLower: "$$mixMachineNum" }
                  }
                }
              }
            },
            {
              $project: { _id: 1, name: 1, companyName: 1, type: 1 }
            }
          ],
          as: "mixtureMachineDetails"
        }
      },

      // Ensure final shape is safe for React UI
      {
        $project: {
          _id: 1,
          mainItemId: "$_id",
          itemNo: 1,
          length: 1,
          noOfSticks: 1,
          helpers: 1,
          operators: 1,
          mixtures: 1,
          shift: 1,
          company: 1,
          productImageUrl: 1,
          pendingBoxes: 1,
          completedBoxes: 1,
          machineNumber: 1,
          mixtureMachine: 1,
          boxCount: 1,

          product: {
            _id: { $ifNull: [{ $arrayElemAt: ["$productDetails._id", 0] }, null] },
            name: { $ifNull: [{ $arrayElemAt: ["$productDetails.name", 0] }, "N/A"] },
            about: { $ifNull: [{ $arrayElemAt: ["$productDetails.about", 0] }, "N/A"] },
            description: { $ifNull: [{ $arrayElemAt: ["$productDetails.description", 0] }, "N/A"] },
            productImageUrl: { $ifNull: [{ $arrayElemAt: ["$productDetails.productImageUrl", 0] }, null] }
          },

          machine: {
            _id: { $ifNull: [{ $arrayElemAt: ["$machineDetails._id", 0] }, null] },
            name: { $ifNull: [{ $arrayElemAt: ["$machineDetails.name", 0] }, "N/A"] },
            companyName: { $ifNull: [{ $arrayElemAt: ["$machineDetails.companyName", 0] }, "N/A"] },
            type: { $ifNull: [{ $arrayElemAt: ["$machineDetails.type", 0] }, "N/A"] }
          },

          mixtureMachineDetails: {
            _id: { $ifNull: [{ $arrayElemAt: ["$mixtureMachineDetails._id", 0] }, null] },
            name: { $ifNull: [{ $arrayElemAt: ["$mixtureMachineDetails.name", 0] }, "N/A"] },
            companyName: { $ifNull: [{ $arrayElemAt: ["$mixtureMachineDetails.companyName", 0] }, "N/A"] },
            type: { $ifNull: [{ $arrayElemAt: ["$mixtureMachineDetails.type", 0] }, "N/A"] }
          }
        }
      }
    ]);

    if (!items.length) {
      return res.status(404).json({
        success: false,
        message: "No items found for this employee."
      });
    }

    res.status(200).json({
      success: true,
      count: items.length,
      message: "Items assigned to employee fetched successfully",
      data: items
    });

  } catch (error) {
    console.error("Error fetching assigned products for employee:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assigned products",
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

// Get a single item by ID
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    // findById automatically looks for the _id field
    const item = await MainItem.findById(id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json(item);
  } catch (error) {
    console.error("Error fetching item by ID:", error);

    // Handle case where ID format is invalid (Mongoose CastError)
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    res.status(500).json({ error: 'Failed to fetch item' });
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

