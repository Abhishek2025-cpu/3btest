// controllers/transportPartnerController.js
const TransportPartner = require('../models/TransportPartner'); // Adjust path as needed

// @desc    Add a new transport partner
// @route   POST /api/transport-partners
// @access  Public (or add authentication middleware)
exports.addTransportPartner = async (req, res) => {
  const { name, number, address } = req.body;

  // Basic validation
  if (!name || !number || !address) {
    return res.status(400).json({ msg: 'Please enter all fields: name, number, and address' });
  }

  try {
    const newPartner = new TransportPartner({
      name,
      number,
      address,
    });

    const partner = await newPartner.save();
    res.status(201).json({ success: true, partner });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get all transport partners
// @route   GET /api/transport-partners
// @access  Public (or add authentication middleware)
exports.getTransportPartners = async (req, res) => {
  try {
    const partners = await TransportPartner.find().sort({ name: 1 }); // Sort by name ascending
    res.json(partners);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a transport partner by ID
// @route   DELETE /api/transport-partners/:id
// @access  Public (or add authentication middleware)
exports.deleteTransportPartner = async (req, res) => {
  try {
    const partner = await TransportPartner.findById(req.params.id);

    if (!partner) {
      return res.status(404).json({ msg: 'Transport partner not found' });
    }

    await TransportPartner.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Transport partner removed' });
  } catch (err) {
    console.error(err.message);
    // Handle specific CastError for invalid IDs
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Transport partner not found' });
    }
    res.status(500).send('Server Error');
  }
};