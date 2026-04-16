const express = require('express');
const router = express.Router();

const {
  createReturnRequest,
  getUserReturnRequests,
  getAllReturnRequests,
  getReturnRequestById,
  updateReturnRequestStatus,
} = require('../controllar/returnController');

const { uploadReturnRequestImages } = require('../middleware/uploadMiddleware');

const { checkPermission } = require('../middleware/checkPermission');

/**
 * 🔓 USER REQUEST RETURN
 */
router.post(
  '/request',
  uploadReturnRequestImages,
  createReturnRequest
);

/**
 * 🔐 USER VIEW REQUESTS
 */
router.get(
  '/my-requests/:userId',
  checkPermission('orders'),
  getUserReturnRequests
);

/**
 * 🔐 ADMIN VIEW ALL
 */
router.get(
  '/admin/all',
  checkPermission('orders'),
  getAllReturnRequests
);

/**
 * 🔐 ADMIN VIEW SINGLE
 */
router.get(
  '/admin/:id',
  checkPermission('orders'),
  getReturnRequestById
);

/**
 * 🔐 ADMIN UPDATE STATUS
 */
router.put(
  '/admin/:id/status',
  checkPermission('orders'),
  updateReturnRequestStatus
);

module.exports = router;