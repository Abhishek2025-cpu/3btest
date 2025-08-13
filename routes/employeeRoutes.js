const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  createEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  updateEmployeeStatus,
} = require('../controllar/employeeController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/add-employees', upload.single('adharImage'), createEmployee);
router.get('/get-employees', getAllEmployees);
router.patch('/employees/:id/status', updateEmployeeStatus);

router.get('/employees/:id', getEmployee);
router.put('/update-employees/:id', upload.single('adharImage'), updateEmployee);
router.delete('/delete-employees/:id', deleteEmployee);

module.exports = router;