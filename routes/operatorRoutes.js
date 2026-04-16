const express = require('express');
const router = express.Router();
const { uploadProduct } = require('../middleware/upload'); // multer middleware


const { assignMachineWithOperator,getOperatorAssignmentsByEmployee ,getAllAssignments,updateEmployeeTask } = require('../controllar/machineController');

// POST route to assign machine
// Use upload.array('operatorImages') for multiple images (optional)
router.post(
  '/assign-machine',
  uploadProduct.array('operatorImages', 10),
  assignMachineWithOperator
);

router.put("/update/:id", updateEmployeeTask);

router.get('/get-assign-machine-operator', getOperatorAssignmentsByEmployee);

router.get("/get-All-Assignments",getAllAssignments);

module.exports = router;