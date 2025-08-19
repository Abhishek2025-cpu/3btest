// controllers/stockTransferController.js

const StockTransfer = require('../models/stockTransferModel');
const Product = require('../models/ProductUpload'); // Make sure path is correct
const Employee = require('../models/Employee'); // Make sure path is correct

// A helper to populate the necessary fields for a consistent response
const populateFields = (query) => {
  return query
    .populate('productId')
    .populate({
      path: 'staffEmployeeId',
      select: 'name role eid' // Select only the fields you need
    });
};


// @desc    Create a new stock transfer (LOADING)
// @route   POST /api/transfers/load
// @access  Private (should be protected)
exports.createLoadingTransfer = async (req, res) => {
  try {
    const {
      productId,
      staffEmployeeId,
      numberOfBoxes,
      startPoint,
      endPoint,
      vehicleNumber,
      driverName
    } = req.body;

    // Basic validation
    if (!productId || !staffEmployeeId || !numberOfBoxes || !startPoint || !endPoint || !vehicleNumber || !driverName) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    // Check if Product and Employee exist
    const productExists = await Product.findById(productId);
    const employeeExists = await Employee.findById(staffEmployeeId);
    if (!productExists || !employeeExists) {
        return res.status(404).json({ message: 'Product or Employee not found.' });
    }

    const newTransfer = new StockTransfer({
      productId,
      staffEmployeeId,
      numberOfBoxes,
      startPoint,
      endPoint,
      vehicleNumber,
      driverName,
      status: 'LOADING' // Initial status
    });

    const savedTransfer = await newTransfer.save();
    
    // Respond with populated data
    const populatedTransfer = await populateFields(StockTransfer.findById(savedTransfer._id));

    res.status(201).json(populatedTransfer);

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update a transfer at UNLOADING
// @route   POST /api/transfers/unload/:id 
// @access  Private
exports.createUnloadingTransfer = async (req, res) => {
  try {
    const transferId = req.params.id;
    const { damagedBoxCount, damagedBoxIds } = req.body;

    const transfer = await StockTransfer.findById(transferId);

    if (!transfer) {
      return res.status(404).json({ message: 'Stock transfer record not found.' });
    }
    
    // Update the record with unloading information
    transfer.unloadingTimestamp = new Date();
    transfer.status = 'COMPLETED'; // Mark as completed upon unloading
    
    // Handle damaged boxes. If count is 0, damagedBoxCount can be null or 0.
    const finalDamagedCount = damagedBoxCount ? parseInt(damagedBoxCount, 10) : 0;

    if (finalDamagedCount > 0) {
      if (!damagedBoxIds || !Array.isArray(damagedBoxIds) || damagedBoxIds.length !== finalDamagedCount) {
        return res.status(400).json({ message: `Please provide an array of ${finalDamagedCount} damaged box IDs.` });
      }
      transfer.damagedBoxCount = finalDamagedCount;
      transfer.damagedBoxIds = damagedBoxIds;
    } else {
      transfer.damagedBoxCount = 0;
      transfer.damagedBoxIds = [];
    }

    const updatedTransfer = await transfer.save();

    // Respond with populated data
    const populatedTransfer = await populateFields(StockTransfer.findById(updatedTransfer._id));
    
    res.status(200).json(populatedTransfer);

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update the status of a transfer (shipped, out for delivery, etc.)
// @route   PATCH /api/transfers/status/:id
// @access  Private
exports.updateTransferStatus = async (req, res) => {
    try {
        const transferId = req.params.id;
        const { status } = req.body;

        const validStatuses = ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const transfer = await StockTransfer.findById(transferId);
        if (!transfer) {
            return res.status(404).json({ message: 'Stock transfer record not found.' });
        }

        transfer.status = status;
        const updatedTransfer = await transfer.save();

        const populatedTransfer = await populateFields(StockTransfer.findById(updatedTransfer._id));

        res.status(200).json(populatedTransfer);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc    Get a single stock transfer by its ID
// @route   GET /api/transfers/:id
// @access  Public/Private
exports.getTransferById = async (req, res) => {
  try {
    const transfer = await populateFields(StockTransfer.findById(req.params.id));
    
    if (!transfer) {
      return res.status(404).json({ message: 'Stock transfer record not found.' });
    }
    
    res.status(200).json(transfer);

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all stock transfers
// @route   GET /api/transfers
// @access  Public/Private
exports.getAllTransfers = async (req, res) => {
  try {
    const transfers = await populateFields(StockTransfer.find({}).sort({ createdAt: -1 }));
    res.status(200).json(transfers);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};