// routes/billingRoutes.js
const express = require("express");
const {
  createBilling,
  getBillings,
  getBillingById,
  updateBilling,
  deleteBilling,
} = require("../controllers/billingController");

const router = express.Router();

router.post("/add", createBilling);
router.get("/get", getBillings);
router.get("/:id", getBillingById);
router.put("/update/:id", updateBilling);
router.delete("/delete/:id", deleteBilling);

module.exports = router;
