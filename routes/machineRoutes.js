const express = require("express");
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage(); 
const upload = multer({ storage });

const {
  addMachine,
  getMachines,
  deleteMachine,
  assignMachineWithOperator,
  getAssignmentsByEmployeeId,
  getAllAssignmentsForAdmin,
  getAllAssignments,
} = require("../controllar/machineController");

router.post("/add", upload.single("image"), addMachine);

router.post("/assign-machine", upload.array("operatorImages", 2), assignMachineWithOperator);
// Other routes
router.get("/get", getMachines);
router.delete("/delete/:id", deleteMachine);
router.get("/get-asign-machine/:employeeId", getAssignmentsByEmployeeId);
router.get("/get-all-assigned-machines-admin", getAllAssignmentsForAdmin);
router.get("/all", getAllAssignments);

module.exports = router;
