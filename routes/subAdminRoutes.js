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
  setPermissions,
  sendLoginOtpSubAdmin,
  verifyLoginOtpSubAdmin
} = require('../controllar/subAdminController');

const {
  upload,   // ✅ ADD THIS
  uploadVerificationDoc,
  uploadProfilePic
} = require('../middleware/uploadMiddleware');





/**
 * 🔐 REGISTER SUBADMIN (ONLY ADMIN)
 */
router.post(
  '/register',
  upload.fields([
    { name: 'verificationDocument', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 }
  ]),
  registerSubAdmin
);

/**
 * 🔓 LOGIN (PUBLIC)
 */
router.post('/send-otp', sendLoginOtpSubAdmin);

/**
 * 🔓 VERIFY OTP (LOGIN STEP 2)
 */
router.post('/verify-otp', verifyLoginOtpSubAdmin);

/**
 * 🔐 SET PERMISSIONS
 */
router.put(
  '/set-permissions',

  setPermissions
);

/**
 * 🔐 GET ALL SUBADMINS
 */
router.get(
  '/sub-admins',

  getAllSubAdmins
);

/**
 * 🔐 GET SINGLE SUBADMIN
 */
router.get(
  '/sub-admin/:id',

  getSubAdminById
);

/**
 * 🔐 UPDATE SUBADMIN
 */
router.put(
  '/update/:id',

  uploadProfilePic,
  updateSubAdmin
);

/**
 * 🔐 UPDATE STATUS
 */
router.patch(
  '/status/:id',

  updateSubAdminStatus
);

/**
 * 🔐 DELETE SUBADMIN
 */
router.delete(
  '/delete/:id',

  deleteSubAdmin
);

module.exports = router;