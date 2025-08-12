// /routes/subAdminRoutes.js

const express = require('express');
const router = express.Router();

const {
  registerSubAdmin,
  loginSubAdmin,
  getAllSubAdmins,
  getSubAdminById,
  updateSubAdmin,
  updateSubAdminStatus,
  deleteSubAdmin,
} = require('../controllers/subAdminController');

// Import the specific middleware functions you need by destructuring the export
const {
  uploadVerificationDoc,
  uploadProfilePic,
} = require('../middleware/uploadMiddleware');

// CREATE: Register a new sub-admin. Uses the 'verificationDocument' middleware.
router.post('/register', uploadVerificationDoc, registerSubAdmin);

// VALIDATE: Verify a sub-admin's credentials. No file upload needed.
router.post('/login', loginSubAdmin);

// READ: Get all sub-admins.
router.get('/sub-admins', getAllSubAdmins);

// READ: Get a single sub-admin by their database _id.
router.get('/sub-admin/:id', getSubAdminById);

// UPDATE: Update a sub-admin's details. Uses the 'profilePicture' middleware.
router.put('/update/:id', uploadProfilePic, updateSubAdmin);

// UPDATE: Change a sub-admin's status.
router.patch('sub-admin/status/:id', updateSubAdminStatus);

// DELETE: Delete a sub-admin.
router.delete('delete/:id', deleteSubAdmin);

module.exports = router;