const express = require("express");
const {
  addMixtureForm,
  getMixtureFormById,
  getAllMixtureForms,
  getMixtureFormsByMixtureId,
} = require("../controllar/mixtureTableController");

const router = express.Router();

router.post("/add", addMixtureForm);
router.get("/all", getAllMixtureForms);
router.get("/:id", getMixtureFormById);

router.get("/mixture/:mixtureId", getMixtureFormsByMixtureId);


module.exports = router;
