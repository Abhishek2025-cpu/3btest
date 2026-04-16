// const express = require('express');
// const multer = require('multer');
// const router = express.Router();
// const {
//   createEmployee,
//   getAllEmployees,
//   getEmployeeById,
//   updateEmployee,
//   deleteEmployee,
//   updateEmployeeStatus,
//   loginEmployee,
//   getEmployeesByFilter
// } = require('../controllar/employeeController');

// const upload = multer({ storage: multer.memoryStorage() });



// router.post(
//   "/add-employees",
//   upload.fields([
//     { name: "adharImage", maxCount: 1 },   // required
//     { name: "profilePic", maxCount: 1 }    // optional
//   ]),
//   createEmployee
// );
// router.get('/get-employees', getAllEmployees);
// router.get("/get-role-base-employee-data", getEmployeesByFilter);
// router.patch('/employees/:id/status', updateEmployeeStatus);

// router.get('/employees/:id', getEmployeeById);

// router.put('/update/:id', upload.fields([
//   { name: 'adharImage', maxCount: 1 },
//   { name: 'profilePic', maxCount: 1 }
// ]),updateEmployee);
// router.delete('/delete-employees/:id', deleteEmployee);
// router.post('/login', loginEmployee);

// module.exports = router;

const express = require('express');
const multer = require('multer');
const router = express.Router();

const {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  updateEmployeeStatus,
  loginEmployee,
  getEmployeesByFilter
} = require('../controllar/employeeController');

const { checkPermission } = require('../middleware/checkPermission');

const upload = multer({ storage: multer.memoryStorage() });

/**
 * 🔐 ADD EMPLOYEE
 */
router.post(
  "/add-employees",
  checkPermission('users.staff.add'),
  upload.fields([
    { name: "adharImage", maxCount: 1 },
    { name: "profilePic", maxCount: 1 }
  ]),
  createEmployee
);

/**
 * 🔐 GET ALL EMPLOYEES
 */
router.get(
  '/get-employees',
  checkPermission('users.staff.view'),
  getAllEmployees
);

/**
 * 🔐 FILTER EMPLOYEES (ROLE BASED)
 */
router.get(
  "/get-role-base-employee-data",
  checkPermission('users.staff.view'),
  getEmployeesByFilter
);

/**
 * 🔐 UPDATE EMPLOYEE STATUS
 */
router.patch(
  '/employees/:id/status',
  checkPermission('users.staff.view'),
  updateEmployeeStatus
);

/**
 * 🔐 GET EMPLOYEE BY ID
 */
router.get(
  '/employees/:id',
  checkPermission('users.staff.view'),
  getEmployeeById
);

/**
 * 🔐 UPDATE EMPLOYEE
 */
router.put(
  '/update/:id',
  checkPermission('users.staff.add'),
  upload.fields([
    { name: 'adharImage', maxCount: 1 },
    { name: 'profilePic', maxCount: 1 }
  ]),
  updateEmployee
);

/**
 * 🔐 DELETE EMPLOYEE
 */
router.delete(
  '/delete-employees/:id',
  checkPermission('users.staff.view'),
  deleteEmployee
);

/**
 * 🔓 LOGIN EMPLOYEE (NO PERMISSION CHECK)
 */
router.post(
  '/login',
  loginEmployee
);

module.exports = router;