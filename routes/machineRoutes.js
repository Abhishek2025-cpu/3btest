const express = require("express");
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage(); 
const upload = multer({ storage });
const { addMachine, getMachines, deleteMachine, assignMachineWithOperator, getAssignmentsByEmployee, getAllAssignmentsForAdmin } = require("../controllar/machineController");

// Add new machine
router.post("/add", upload.single("image"), addMachine);

// Assign machine with operator table
router.post('/assign-machine', upload.array('operatorImages', 2), assignMachineWithOperator);


// Other routes
router.get("/get", getMachines);
router.delete("/delete/:id", deleteMachine);
router.get("/get-asign-machine/:employeeId", getAssignmentsByEmployee);
router.get("/get-all-assigned-machines-admin", getAllAssignmentsForAdmin);

module.exports = router;
