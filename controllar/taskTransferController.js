const mongoose = require("mongoose");
const MainItem = require("../models/item.model");
const TaskTransfer = require("../models/TaskTransfer");
const User = require("../models/Employee");
const { translateResponse } = require('../services/translation.service');

exports.transferAssignedTask = async (req, res) => {
  try {
    const { mainItemId, fromEmployeeId, toEmployeeId, reason } = req.body;

    if (!mainItemId || !fromEmployeeId || !toEmployeeId) {
      return res.status(400).json({
        success: false,
        message: "mainItemId, fromEmployeeId, and toEmployeeId are required.",
      });
    }

    // ✅ 1. Fetch the main item
    const item = await MainItem.findById(mainItemId);
    if (!item)
      return res.status(404).json({ success: false, message: "Main item not found." });

    // ✅ 2. Fetch the employee being transferred to
    const toEmployee = await User.findById(toEmployeeId).select("_id name eid");
    if (!toEmployee)
      return res.status(404).json({ success: false, message: "Target employee not found." });

    let updated = false;

    // ✅ 3. Check where the fromEmployee is assigned and replace properly
    const isHelper = item.helpers.some(
      (emp) => emp._id.toString() === fromEmployeeId
    );

    const isOperator = item.operators.some(
      (emp) => emp._id.toString() === fromEmployeeId
    );

    if (isHelper) {
      item.helpers = item.helpers.map((emp) =>
        emp._id.toString() === fromEmployeeId
          ? {
              _id: toEmployee._id,
              name: toEmployee.name,
              eid: toEmployee.eid,
            }
          : emp
      );
      updated = true;
    } else if (isOperator) {
      item.operators = item.operators.map((emp) =>
        emp._id.toString() === fromEmployeeId
          ? {
              _id: toEmployee._id,
              name: toEmployee.name,
              eid: toEmployee.eid,
            }
          : emp
      );
      updated = true;
    } else {
      return res.status(404).json({
        success: false,
        message: "Employee not found in helpers or operators list.",
      });
    }

    if (!updated)
      return res.status(400).json({
        success: false,
        message: "No transfer occurred.",
      });

    // ✅ 4. Save the updated item
    await item.save();

    // ✅ 5. Log the transfer
    await TaskTransfer.create({
      mainItemId,
      fromEmployee: fromEmployeeId,
      toEmployee: toEmployeeId,
      reason,
      transferredBy: req.Employee?._id || null, // optional if using auth
    });

    return res.status(200).json({
      success: true,
      message: "Task transferred successfully.",
      data: item,
    });
  } catch (error) {
    console.error("Error transferring task:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to transfer task.",
      error: error.message,
    });
  }
};




exports.getTaskTransfers = async (req, res) => {
  try {
    const { employeeId } = req.query;

    const filter = employeeId
      ? {
          $or: [
            { fromEmployee: employeeId },
            { toEmployee: employeeId },
          ],
        }
      : {};

    // 1. Original Data fetch karein
    const transfers = await TaskTransfer.find(filter)
      .populate("mainItemId", "itemNo company machineNumber")
      .populate("fromEmployee", "name email")
      .populate("toEmployee", "name email")
      .populate("transferredBy", "name email")
      .sort({ createdAt: -1 });

    // 2. Translation ke liye fields specify karein
    const fieldsToTranslate = [
      "mainItemId.company",
      "fromEmployee.name",
      "toEmployee.name",
      "transferredBy.name"
    ];

    // 3. Translated Data generate karein
    // Note: Agar 'lang' query mein nahi hoga, toh ye 'transfers' hi return karega
    const translatedTransfers = await translateResponse(req, transfers, fieldsToTranslate);

    // 4. Response mein dono cheezein bhejein
    return res.status(200).json({
      success: true,
      count: transfers.length,
      data: translatedTransfers,      // Yeh translated wala data hai
      originalTransfers: transfers    // Yeh original (bin-translated) data hai
    });

  } catch (error) {
    console.error("Error fetching transfer history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transfer history",
      error: error.message,
    });
  }
};