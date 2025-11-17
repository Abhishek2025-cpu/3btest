const mongoose = require("mongoose");
const MixtureTable = require("../models/mixturetables");

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
