const mongoose = require("mongoose");
const MixtureTable = require("../models/mixturetables");
const MainItem = require("../models/item.model");

// -------------------------
// ADD NEW MIXTURE FORM
// -------------------------
exports.addMixtureForm = async (req, res) => {
  try {
    const data = req.body;

    const newForm = await MixtureTable.create({
      ...data,
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Mixture form added successfully",
      data: newForm,
    });
  } catch (error) {
    console.error("Error adding mixture form:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add mixture form",
      error: error.message,
    });
  }
};



// -------------------------
// GET FORM BY ID
// -------------------------
exports.getAllMixtureForms = async (req, res) => {
  try {
    const forms = await MixtureTable.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "itemId",
        select: "itemNo length productImageUrl"
      })
      .populate({
        path: "mixtureId",
        select: "name eid"
      });

    return res.status(200).json({
      success: true,
      message: "Mixture forms fetched successfully",
      count: forms.length,
      data: forms,
    });
  } catch (error) {
    console.error("Error fetching mixture forms:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch mixture forms",
      error: error.message,
    });
  }
};


// -------------------------
// GET ALL MIXTURE FORMS
// -------------------------
exports.getMixtureFormById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid form ID format.",
      });
    }

    const form = await MixtureTable.findById(id)
      .populate({
        path: "itemId",
        select: "itemNo length productImageUrl"
      })
      .populate({
        path: "mixtureId",
        select: "name eid"
      });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Mixture form not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mixture form fetched successfully",
      data: form,
    });

  } catch (error) {
    console.error("Error fetching mixture form:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch mixture form",
      error: error.message,
    });
  }
};

exports.getMixtureFormsByMixtureId = async (req, res) => {
  try {
    const { mixtureId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mixtureId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mixtureId format."
      });
    }

    const forms = await MixtureTable.find({ mixtureId: mixtureId })
      .sort({ createdAt: -1 })
      .populate({ path: "itemId", select: "itemNo length productImageUrl" })
      .populate({ path: "mixtureId", select: "name eid" });

    if (!forms || forms.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No mixture forms found for this mixture employee."
      });
    }

    return res.status(200).json({
      success: true,
      message: `Mixture forms for mixture ${mixtureId} fetched successfully.`,
      count: forms.length,
      data: forms
    });

  } catch (err) {
    console.error("Error fetching mixture forms by mixtureId:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch mixture forms",
      error: err.message
    });
  }
};

const MixtureTransfer = require("../models/mixtureTransfer");

// ----------------------------------------------------
// TRANSFER TASK FROM ONE MIXTURE EMPLOYEE TO ANOTHER
// ----------------------------------------------------
exports.transferMainItemTasks = async (req, res) => {
  try {
    const { mainItemId, fromMixtureId, toMixtureId, reason } = req.body;

    if (!mainItemId || !fromMixtureId || !toMixtureId) {
      return res.status(400).json({
        success: false,
        message: "mainItemId, fromMixtureId and toMixtureId are required",
      });
    }

    // Validate Object IDs
    if (
      !mongoose.Types.ObjectId.isValid(mainItemId) ||
      !mongoose.Types.ObjectId.isValid(fromMixtureId) ||
      !mongoose.Types.ObjectId.isValid(toMixtureId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ObjectId format",
      });
    }

    // Check if MainItem exists
    const mainItem = await MainItem.findById(mainItemId);
    if (!mainItem) {
      return res.status(404).json({
        success: false,
        message: "MainItem not found",
      });
    }

    // 🟦 DEBUG LOG — SEE EXACT DB IDs
    console.log("🔍 Checking tasks with:");
    console.log("mainItemId:", mainItemId);
    console.log("fromMixtureId:", fromMixtureId);

    // Find all tasks assigned to fromMixtureId for this MainItem
    const formsToTransfer = await MixtureTable.find({
      itemId: mainItemId,
      mixtureId: fromMixtureId,
    });

    console.log("🔍 Found tasks:", formsToTransfer.length);

    if (formsToTransfer.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No tasks found for this mainItemId under this fromMixtureId — IDs DO NOT MATCH.",
      });
    }

    const affectedFormIds = formsToTransfer.map((f) => f._id);

    // Update tasks
    await MixtureTable.updateMany(
      { itemId: mainItemId, mixtureId: fromMixtureId },
      { $set: { mixtureId: toMixtureId } }
    );

    // Log transfer
    const transferLog = await MixtureTransfer.create({
      mainItemId,
      fromMixtureId,
      toMixtureId,
      affectedFormIds,
      reason: reason || "",
    });

    return res.status(200).json({
      success: true,
      message: "Task transfer completed successfully",
      transferredCount: affectedFormIds.length,
      transferLog,
    });
  } catch (error) {
    console.error("❌ Error in transferMainItemTasks:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};




// ----------------------------------------------------
// GET TRANSFER HISTORY FOR A MIXTURE EMPLOYEE
// ----------------------------------------------------
exports.getTransfersByMainItemId = async (req, res) => {
  try {
    const { mainItemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mainItemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mainItemId format"
      });
    }

    const logs = await MixtureTransfer.find({ mainItemId })
      .sort({ createdAt: -1 })
      .populate({ path: "mainItemId", select: "itemNo length noOfSticks" })
      .populate({ path: "fromMixtureId", select: "name eid" })
      .populate({ path: "toMixtureId", select: "name eid" })
      .populate({ path: "affectedFormIds", select: "date shift machineNo" });

    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No transfer logs found for this main item"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transfer logs fetched successfully",
      count: logs.length,
      data: logs
    });

  } catch (error) {
    console.error("Error fetching logs by mainItemId:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transfer logs",
      error: error.message,
    });
  }
};


exports.getAllTransfers = async (req, res) => {
  try {
    const transfers = await MixtureTransfer.find()
      .populate("mainItemId", "itemNo shift company")
      .populate("fromMixtureId", "name eid")
      .populate("toMixtureId", "name eid")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    console.error("Error fetching transfers:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};