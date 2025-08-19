// routes/stockTransferRoutes.js

const express = require('express');
const router = express.Router();

const {
  createLoadingTransfer,
  createUnloadingTransfer,
  updateTransferStatus,
  getTransferById,
  getAllTransfers
} = require('../controllers/stockTransferController');

// --- POST APIs ---
// 1. Create a new "Loading" record
router.post('/load', createLoadingTransfer);

// 2. Update a record for "Unloading"
router.post('/unload/:id', createUnloadingTransfer);


// --- GET APIs ---
// 1. Get a specific transfer record by ID
router.get('/all/:id', getTransferById);

// 2. Get all transfer records
router.get('/all', getAllTransfers);


// --- STATUS UPDATE API ---
// 1. Update the status of a transfer
router.patch('/status/:id', updateTransferStatus);


module.exports = router;