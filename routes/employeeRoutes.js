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
  employeeLoginSendOtp,
  employeeLoginVerifyOtp,
 
} = require('../controllar/employeeController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/employee/login/send-otp', employeeLoginSendOtp);
router.post('/employee/login/verify-otp', employeeLoginVerifyOtp);

router.post('/add-employees', upload.single('adharImage'), createEmployee);
router.get('/get-employees', getAllEmployees);
router.patch('/employees/:id/status', updateEmployeeStatus);

router.get('/employees/:id', getEmployeeById);

router.put('/update-employees/:id', upload.single('adharImage'), updateEmployee);
router.delete('/delete-employees/:id', deleteEmployee);
// router.post('/login', loginEmployee);

module.exports = router;