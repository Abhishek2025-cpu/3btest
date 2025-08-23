// routes/shipment.routes.js

const express = require('express');
const router = express.Router();

const {
  addShipment,
  getAllShipments,
  getShipmentById,
  getShipmentsByHelper,
  deleteShipment
} = require('../controllar/shipment.controller');

// POST a new shipment
router.post('/create', addShipment);

// GET all shipments
router.get('/all', getAllShipments);

// GET all shipments for a specific helper
// Note: This route is placed before '/:id' to avoid 'helper' being treated as an ID.
router.get('/helper/:helperId', getShipmentsByHelper);

// GET a single shipment by its ID
router.get('/get/:id', getShipmentById);

// DELETE a shipment by its ID
router.delete('/delete/:id', deleteShipment);


module.exports = router;