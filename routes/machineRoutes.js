const express = require("express");
const router = express.Router();
const { uploadProduct } = require("../middleware/upload");
const { addMachine, getMachines,deleteMachine, assignMachineToEmployees ,getAssignmentsByEmployee,getAllAssignmentsForAdmin } = require("../controllar/machineController");



// Add new machine
router.post("/add", uploadProduct.single("image"), addMachine);

// Get all machines
router.get("/get", getMachines);
router.delete("/delete/:id", deleteMachine);

router.post("/assign-machine", assignMachineToEmployees);

router.get("/get-asign-machine/:employeeId", getAssignmentsByEmployee);

router.get("/get-all-assigned-machines-admin" ,getAllAssignmentsForAdmin);

module.exports = router;

