// // routes/billingRoutes.js
// const express = require("express");
// const {
//   createBilling,
//   getBillings,
//   getBillingById,
//   updateBilling,
//   deleteBilling,
// } = require("../controllar/billingController");

// const router = express.Router();

// router.post("/add", createBilling);
// router.get("/get", getBillings);
// router.get("/:id", getBillingById);
// router.put("/update/:id", updateBilling);
// router.delete("/delete/:id", deleteBilling);

// module.exports = router;





const express = require("express");
const {
  createBilling,
  getBillings,
  getBillingById,
  updateBilling,
  deleteBilling,
} = require("../controllar/billingController");

const { checkPermission } = require("../middleware/checkPermission");

const router = express.Router();

/**
 * 🔐 CREATE BILLING
 */
router.post(
  "/add",
  checkPermission("billing"),
  createBilling
);

/**
 * 🔐 GET ALL BILLINGS
 */
router.get(
  "/get",
  checkPermission("allBills"),
  getBillings
);

/**
 * 🔐 GET SINGLE BILL
 */
router.get(
  "/:id",
  checkPermission("allBills"),
  getBillingById
);

/**
 * 🔐 UPDATE BILLING
 */
router.put(
  "/update/:id",
  checkPermission("billing"),
  updateBilling
);

/**
 * 🔐 DELETE BILLING
 */
router.delete(
  "/delete/:id",
  checkPermission("billing"),
  deleteBilling
);

module.exports = router;