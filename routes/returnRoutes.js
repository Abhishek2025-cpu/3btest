const express = require('express');
const router = express.Router();
const {
  createReturnRequest,
  getUserReturnRequests,
  getAllReturnRequests,
  getReturnRequestById,
  updateReturnRequestStatus,
} = require('../controllar/returnController');

const { uploadReturnRequestImages } = require('../middleware/uploadMiddleware'); // use the correct file name

// const { isAuthenticated, isAdmin } = require('../middleware/auth'); // Protect your routes!

// === Customer Routes ===
// Assuming you have middleware to get user from token
router.post(
  '/request',
  // isAuthenticated,
  // MODIFICATION: Use the clean, specific middleware directly
  uploadReturnRequestImages,
  createReturnRequest
);
router.get('/my-requests/:userId', /* isAuthenticated, */ getUserReturnRequests);


// === Admin Routes ===
router.get('/admin/all', /* isAuthenticated, isAdmin, */ getAllReturnRequests);
router.get('/admin/:id', /* isAuthenticated, isAdmin, */ getReturnRequestById);
router.put('/admin/:id/status', /* isAuthenticated, isAdmin, */ updateReturnRequestStatus);


module.exports = router;