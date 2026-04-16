const express = require("express");

const {
  addMixtureForm,
  getMixtureFormById,
  getAllMixtureForms,
  getMixtureFormsByMixtureId,
  transferMainItemTasks,
  getTransfersByMainItemId,
  getAllTransfers,
} = require("../controllar/mixtureTableController");

const router = express.Router();

const { checkPermission } = require("../middleware/checkPermission");

/**
 * 🔐 ADD MIXTURE
 */
router.post(
  "/add",
  checkPermission("machines.mixtureTable"),
  addMixtureForm
);

/**
 * 🔐 GET ALL MIXTURES
 */
router.get(
  "/all",
  checkPermission("machines.mixtureTable"),
  getAllMixtureForms
);

/**
 * 🔐 GET MIXTURE BY ID
 */
router.get(
  "/:id",
  checkPermission("machines.mixtureTable"),
  getMixtureFormById
);

/**
 * 🔐 GET BY MIXTURE ID
 */
router.get(
  "/mixture/:mixtureId",
  checkPermission("machines.mixtureTable"),
  getMixtureFormsByMixtureId
);

/**
 * 🔐 TRANSFER TASKS
 */
router.post(
  "/transfer",
  checkPermission("machines.mixtureTable"),
  transferMainItemTasks
);

/**
 * 🔐 GET TRANSFERS BY MAIN ITEM
 */
router.get(
  "/transfers/:mainItemId",
  checkPermission("machines.mixtureTable"),
  getTransfersByMainItemId
);

/**
 * 🔐 GET ALL TRANSFERS
 */
router.get(
  "/transfer/all",
  checkPermission("machines.mixtureTable"),
  getAllTransfers
);

module.exports = router;