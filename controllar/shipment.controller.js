// controllers/shipment.controller.js

const Shipment = require('../models/shipment.model');

// @desc    Create a new shipment
// @route   POST /api/shipments
// @access  Private
const addShipment = async (req, res) => {
  try {
    const { vehicle, vehicleNumber, driverId, helperId, orderId, quantity, startPoint, endPoint } = req.body;

    // Basic validation
    if (!vehicle || !vehicleNumber || !driverId || !helperId || !orderId || !quantity || !startPoint || !endPoint) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }
    
    // Check if a shipment for this order already exists
    const existingShipment = await Shipment.findOne({ orderId });
    if (existingShipment) {
      return res.status(409).json({ message: 'A shipment for this order already exists.' });
    }

    const newShipment = new Shipment({
      vehicle,
      vehicleNumber,
      driverId,
      helperId,
      orderId,
      quantity,
      startPoint,
      endPoint
    });

    await newShipment.save();
    res.status(201).json({ message: 'Shipment created successfully', shipment: newShipment });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all shipments with populated data
// @route   GET /api/shipments
// @access  Private
const getAllShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find({})
      .populate('driverId', 'name mobile role') // Populates driver's data, selecting specific fields
      .populate('helperId', 'name mobile role') // Populates helper's data
      .populate('orderId'); // Populates the full order data

    res.status(200).json(shipments);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get a single shipment by its ID
// @route   GET /api/shipments/:id
// @access  Private
const getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate('driverId', 'name mobile role')
      .populate('helperId', 'name mobile role')
      .populate({
          path: 'orderId',
          populate: { // Nested population to get user details inside the order
              path: 'userId',
              select: 'name email' // Assuming User model has name and email
          }
      });

    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found.' });
    }

    res.status(200).json(shipment);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all shipments assigned to a specific helper
// @route   GET /api/shipments/helper/:helperId
// @access  Private
const getShipmentsByHelper = async (req, res) => {
  try {
    const { helperId } = req.params;
    const shipments = await Shipment.find({ helperId: helperId })
      .populate('driverId', 'name mobile role')
      .populate('helperId', 'name mobile role')
      .populate('orderId');

    if (!shipments || shipments.length === 0) {
      return res.status(404).json({ message: 'No shipments found for this helper.' });
    }

    res.status(200).json(shipments);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};


// @desc    Delete a shipment by ID
// @route   DELETE /api/shipments/:id
// @access  Private
const deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndDelete(req.params.id);

    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found.' });
    }

    res.status(200).json({ message: 'Shipment deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};


module.exports = {
  addShipment,
  getAllShipments,
  getShipmentById,
  getShipmentsByHelper,
  deleteShipment
};