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
  setPermissions
} = require('../controllar/subAdminController');

const {
  uploadVerificationDoc,
  uploadProfilePic
} = require('../middleware/uploadMiddleware');

const { checkPermission } = require('../middleware/checkPermission');

/**
 * 🔐 REGISTER SUBADMIN (ONLY ADMIN)
 */
router.post(
  '/register',
  checkPermission('admins'),
  uploadVerificationDoc,
  registerSubAdmin
);

/**
 * 🔓 LOGIN (PUBLIC)
 */
router.post('/login', loginSubAdmin);

/**
 * 🔐 SET PERMISSIONS
 */
router.put(
  '/set-permissions',
  checkPermission('admins'),
  setPermissions
);

/**
 * 🔐 GET ALL SUBADMINS
 */
router.get(
  '/sub-admins',
  checkPermission('admins'),
  getAllSubAdmins
);

/**
 * 🔐 GET SINGLE SUBADMIN
 */
router.get(
  '/sub-admin/:id',
  checkPermission('admins'),
  getSubAdminById
);

/**
 * 🔐 UPDATE SUBADMIN
 */
router.put(
  '/update/:id',
  checkPermission('admins'),
  uploadProfilePic,
  updateSubAdmin
);

/**
 * 🔐 UPDATE STATUS
 */
router.patch(
  '/status/:id',
  checkPermission('admins'),
  updateSubAdminStatus
);

/**
 * 🔐 DELETE SUBADMIN
 */
router.delete(
  '/delete/:id',
  checkPermission('admins'),
  deleteSubAdmin
);

module.exports = router;