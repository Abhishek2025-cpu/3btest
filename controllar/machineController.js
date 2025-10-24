const Machine = require("../models/Machine");
const Employee = require("../models/Employee");
const cloudinary = require("cloudinary").v2;
const { uploadBufferToGCS } = require('../utils/gcloud'); // your GCS upload helper
const sharp = require('sharp');

const MachineAssignment = require('../models/MachineAssignment');

const MainItem = require('../models/item.model');



// Add new machine
exports.addMachine = async (req, res) => {
  try {
    const { name, companyName, dateOfManufacturing, type } = req.body;

    if (!name || !companyName || !dateOfManufacturing || !type) {
      return res.status(400).json({ success: false, message: "⚠️ All fields are required" });
    }

    let imageUrl = null;

    if (req.file) {
      // Upload image to cloudinary
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "machines" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      imageUrl = result.secure_url;
    }

    const newMachine = new Machine({
      name,
      companyName,
      dateOfManufacturing,
      type,
      image: imageUrl,
    });

    await newMachine.save();

    res.status(201).json({
      success: true,
      message: "✅ Machine added successfully",
      data: newMachine,
    });
  } catch (error) {
    console.error("Add Machine Error:", error);
    res.status(500).json({ success: false, message: "❌ Server error" });
  }
};

// Get all machines
exports.getMachines = async (req, res) => {
  try {
    const machines = await Machine.find().sort({ createdAt: -1 });
    res.json({ success: true, data: machines });
  } catch (error) {
    console.error("Get Machines Error:", error);
    res.status(500).json({ success: false, message: "❌ Server error" });
  }
};



// Delete machine
exports.deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;

    const machine = await Machine.findById(id);
    if (!machine) {
      return res.status(404).json({ success: false, message: "⚠️ Machine not found" });
    }

    // If image exists, remove from cloudinary too
    if (machine.image) {
      // Extract public_id from cloudinary URL
      const publicId = machine.image.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`machines/${publicId}`);
    }

    await Machine.findByIdAndDelete(id);

    res.json({ success: true, message: "🗑️ Machine deleted successfully" });
  } catch (error) {
    console.error("Delete Machine Error:", error);
    res.status(500).json({ success: false, message: "❌ Server error" });
  }
};


//Api for Machine Controller
exports.assignMachineWithOperator = async (req, res) => {
  try {
    console.log("🔹 req.body:", req.body);
    console.log("🔹 req.files:", req.files);

    let { machineId, employeeIds, mainItemId, shift, operatorTable } = req.body;

    // Parse employeeIds
    if (employeeIds && typeof employeeIds === "string") {
      employeeIds = employeeIds.split(",").map(id => id.trim());
    }

    // Parse operatorTable JSON
    try {
      operatorTable = operatorTable ? JSON.parse(operatorTable) : [];
    } catch (err) {
      console.error("❌ Failed to parse operatorTable JSON:", err);
      operatorTable = [];
    }

    // Upload max 2 images
    const operatorImages = [];
    if (req.files && req.files.length > 0) {
      const filesToUpload = req.files.slice(0, 2); // max 2
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const compressedBuffer = await sharp(file.buffer)
          .resize({ width: 1000, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();

        const filename = `operator-${Date.now()}-${file.originalname}`;
        const uploadResult = await uploadBufferToGCS(compressedBuffer, filename, 'operator-table');
        operatorImages.push(uploadResult.url);
        console.log(`✅ Uploaded operator image:`, uploadResult.url);
      }
    }

    // Create assignment
    const assignment = await MachineAssignment.create({
      machine: machineId,
      employees: employeeIds,
      mainItem: mainItemId,
      shift,
      operatorTable,
      operatorImages
    });

    const populatedAssignment = await MachineAssignment.findById(assignment._id)
      .populate({ path: 'machine', select: 'name type' })
      .populate({ path: 'employees', select: 'name role' })
      .populate({ path: 'mainItem' });

    res.status(201).json({
      success: true,
      message: "Machine assigned successfully with operator table and images",
      data: populatedAssignment
    });

  } catch (error) {
    console.error("❌ Assign Machine Error:", error);
    res.status(500).json({ success: false, message: "Server error while assigning machine" });
  }
};




// GET /api/assignments/employee/:employeeId
exports.getAssignmentsByEmployee = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.query.employeeId;
    if (!employeeId) {
      return res.status(400).json({ statusCode: 400, success: false, message: "Employee ID is required" });
    }

    const assignments = await MachineAssignment.find({ employees: employeeId })
      .populate({ path: 'machine', select: 'name type' })
      .populate({ path: 'employees', select: 'name role' })
      .populate({ path: 'mainItem' }); // <-- Populate full mainItem details

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: `Fetched assignments for employee ${employeeId} including main item details`,
      data: assignments
    });
  } catch (error) {
    console.error("Get Employee Assignments Error:", error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: 'Server error while fetching employee assignments'
    });
  }
};




// GET /api/admin/assignments
exports.getAllAssignmentsForAdmin = async (req, res) => {
  try {
    const assignments = await MachineAssignment.find()
      .populate({ path: 'machine', select: 'name type' })
      .populate({ path: 'employees', select: 'name role eid' })
      .populate({
        path: 'mainItem',
        populate: [
          { path: 'helper._id', model: 'Employee', select: 'name role eid' },
          { path: 'operator._id', model: 'Employee', select: 'name role eid' }
        ]
      })
      .sort({ createdAt: -1 }); // optional: latest first

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: "All machine assignments fetched successfully",
      data: assignments
    });
  } catch (error) {
    console.error("Get All Assignments Error:", error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: "Server error while fetching all assignments"
    });
  }
};


//create post api assign Machine











//  Get assignments by employee ID
exports.getOperatorAssignmentsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.query;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required (use ?employeeId=...)"
      });
    }

    // Find assignments for that employee
    const assignments = await MachineAssignment.find({ employees: employeeId })
      .populate({ path: 'machine', select: 'name type' })
      .populate({ path: 'employees', select: 'name role' })
      .populate({ path: 'mainItem', select: 'itemName category' })
      .populate({ path: 'operatorTable', select: 'name role' }); // <-- add this



    if (!assignments.length) {
      return res.status(404).json({
        success: false,
        message: "No assignments found for this employee"
      });
    }

    res.status(200).json({
      success: true,
      message: "Fetched assignments successfully",
      data: assignments
    });

  } catch (error) {
    console.error("Get Assignments Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// GET /api/assignments/all


exports.getAllAssignments = async (req, res) => {
  try {
    const assignments = await MachineAssignment.find()
      .populate({ path: 'machine', select: 'name type' })
      .populate({ path: 'employees', select: 'name role eid' })
      .populate({ path: 'mainItem', select: 'itemName category helper operator' }) // populate mainItem
      .sort({ createdAt: -1 }); // latest first

    if (!assignments.length) {
      return res.status(404).json({
        success: false,
        message: "No machine assignments found"
      });
    }

    res.status(200).json({
      success: true,
      message: "All machine assignments fetched successfully",
      data: assignments
    });
  } catch (error) {
    console.error("Get All Assignments Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching all assignments"
    });
  }
};
