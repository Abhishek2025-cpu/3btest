const express = require('express');
const router = express.Router();

const { uploadProduct } = require('../middleware/upload');

const {
  assignMachineWithOperator,
  getOperatorAssignmentsByEmployee,
  getAllAssignments,
  updateEmployeeTask
} = require('../controllar/machineController');

const { checkPermission } = require('../middleware/checkPermission');

/**
 * 🔐 ASSIGN MACHINE TO OPERATOR
 */
router.post(
  '/assign-machine',
  checkPermission('machines.operatorTable'),
  uploadProduct.array('operatorImages', 10),
  assignMachineWithOperator
);

/**
 * 🔐 UPDATE EMPLOYEE TASK
 */
router.put(
  "/update/:id",
  checkPermission('machines.operatorTable'),
  updateEmployeeTask
);

/**
 * 🔐 GET ASSIGNMENTS BY EMPLOYEE
 */
router.get(
  '/get-assign-machine-operator',
  checkPermission('machines.operatorTable'),
  getOperatorAssignmentsByEmployee
);

/**
 * 🔐 GET ALL ASSIGNMENTS
 */
router.get(
  "/get-All-Assignments",
  checkPermission('machines.operatorTable'),
  getAllAssignments
);

module.exports = router;