const express = require("express");
const {
  addMixtureForm,
  getMixtureFormById,
  getAllMixtureForms,
  getMixtureFormsByMixtureId,
  transferMainItemTasks,   // <-- FIXED NAME
  getTransfersByMainItemId,
  getAllTransfers,
} = require("../controllar/mixtureTableController");

const router = express.Router();

router.post("/add", addMixtureForm);
router.get("/all", getAllMixtureForms);
router.get("/:id", getMixtureFormById);

router.get("/mixture/:mixtureId", getMixtureFormsByMixtureId);

router.post("/transfer", transferMainItemTasks); // <-- FIXED
router.get("/transfers/:mainItemId", getTransfersByMainItemId); // <-- FIXED PARAM NAME
router.get("/transfer/all", getAllTransfers);


module.exports = router;
