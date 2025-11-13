// routes/taskTransferRoutes.js
const express = require("express");
const router = express.Router();
const {
  transferAssignedTask,
  getTaskTransfers,
} = require("../controllar/taskTransferController");

router.post("/transfer", transferAssignedTask);
router.get("/transfers", getTaskTransfers);

module.exports = router;
