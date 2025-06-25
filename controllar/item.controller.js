const Item = require('../models/item.model');
const Employee = require('../models/Employee');
const bwipjs = require('bwip-js');
const { uploadBufferToGCS } = require('../utils/gcloud');

exports.createItem = async (req, res) => {
  try {
    const { itemNo, length, noOfSticks, helperEid, operatorEid, shift, company } = req.body;

    if (!req.file) return res.status(400).json({ error: 'Product image is required' });

    // Find helper/operator using eid instead of _id
    const helper = await Employee.findOne({ eid: helperEid });
    const operator = await Employee.findOne({ eid: operatorEid });

    if (!helper || !operator) {
      return res.status(400).json({ error: 'Invalid helper or operator EID' });
    }

    // Generate barcode data (must be unique and valid for barcode format)
    const barcodeData = `${itemNo}-${Date.now()}`;

    // Generate barcode as PNG buffer using bwip-js
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid:        'code128',       // Barcode type
      text:        barcodeData,     // Text to encode
      scale:       3,               // 3x scaling factor
      height:      10,              // Bar height, in millimeters
      includetext: true,            // Show human-readable text
      textxalign:  'center',        // Center the text
    });

    // Upload barcode and product image to GCS
    const barcodeUrl = await uploadBufferToGCS(barcodeBuffer, `${barcodeData}.png`, 'barcodes');
    const productImageUrl = await uploadBufferToGCS(req.file.buffer, req.file.originalname, 'product-images');

    const item = await Item.create({
      itemNo,
      length,
      noOfSticks,
      helper: { _id: helper._id, name: helper.name, eid: helper.eid },
      operator: { _id: operator._id, name: operator.name, eid: operator.eid },
      shift,
      company,
      barcodeUrl,
      productImageUrl
    });

    res.status(201).json(item);
  } catch (error) {
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
