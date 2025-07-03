// const QRCode = require('qrcode'); // ADD THIS: QR Code generator
// const Item = require('../models/item.model');
// const Employee = require('../models/Employee');
// const { uploadBufferToGCS } = require('../utils/gcloud');

// exports.createItem = async (req, res) => {
//   try {
//     const { itemNo, length, noOfSticks, helperEid, operatorEid, shift, company } = req.body;

//     if (!req.file) return res.status(400).json({ error: 'Product image is required' });

//     // Find helper/operator using eid
//     const helper = await Employee.findOne({ eid: helperEid });
//     const operator = await Employee.findOne({ eid: operatorEid });

//     if (!helper || !operator) {
//       return res.status(400).json({ error: 'Invalid helper or operator EID' });
//     }

//     // Generate unique QR code data
//     const qrCodeData = `${Date.now()}-${itemNo}`;

//     // Generate QR code buffer (PNG)
//     const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
//       type: 'png',
//       errorCorrectionLevel: 'H',
//       margin: 1,
//       width: 500, // Ensures decent resolution
//     });

//     // Upload QR code image to GCS
//     const qrCodeUrl = await uploadBufferToGCS(qrCodeBuffer, `${qrCodeData}.png`, 'qr-codes');

//     // Upload product image
//     const productImageUrl = await uploadBufferToGCS(req.file.buffer, req.file.originalname, 'product-images');

//     // Create item
//     const item = await Item.create({
//       itemNo,
//       length,
//       noOfSticks,
//       helper: { _id: helper._id, name: helper.name, eid: helper.eid },
//       operator: { _id: operator._id, name: operator.name, eid: operator.eid },
//       shift,
//       company,
//       qrCodeUrl, // USE QR CODE URL instead of barcodeUrl
//       productImageUrl,
//     });

//     res.status(201).json(item);
//   } catch (error) {
//     console.error('Create Item Error:', error);
//     res.status(500).json({ error: 'Failed to create item' });
//   }
// };


const QRCode = require('qrcode');
const Item = require('../models/item.model');
const Employee = require('../models/Employee');
const { uploadBufferToGCS } = require('../utils/gcloud');

exports.createItem = async (req, res) => {
  try {
    const { itemNo, length, noOfSticks, helperEid, operatorEid, shift, company } = req.body;

    if (!req.file) return res.status(400).json({ error: 'Product image is required' });

    // Find helper/operator using eid
    const helper = await Employee.findOne({ eid: helperEid });
    const operator = await Employee.findOne({ eid: operatorEid });

    if (!helper || !operator) {
      return res.status(400).json({ error: 'Invalid helper or operator EID' });
    }

    // Generate unique QR code data
    const qrCodeData = `${Date.now()}-${itemNo}`;

    // Generate QR code buffer (PNG)
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
      type: 'png',
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 500,
    });

    // MODIFIED: Upload QR code image to GCS with explicit content type
    const qrCodeUrl = await uploadBufferToGCS(
      qrCodeBuffer,
      `${qrCodeData}.png`,
      'qr-codes',
      'image/png' // Pass the content type
    );

    // MODIFIED: Upload product image with its mimetype from multer
    const productImageUrl = await uploadBufferToGCS(
      req.file.buffer,
      req.file.originalname,
      'product-images',
      req.file.mimetype // Pass the content type from the uploaded file
    );

    // Create item
    const item = await Item.create({
      itemNo,
      length,
      noOfSticks,
      helper: { _id: helper._id, name: helper.name, eid: helper.eid },
      operator: { _id: operator._id, name: operator.name, eid: operator.eid },
      shift,
      company,
      qrCodeUrl,
      productImageUrl,
    });

    res.status(201).json(item);
  } catch (error) {
    // This will now log more specific GCS errors if they occur
    console.error('Create Item Error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
};



exports.getItems = async (req, res) => {
  try {
    const items = await Item.find();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
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

