const Machine = require("../models/Machine");
const cloudinary = require("cloudinary").v2;

const MachineAssignment = require('../models/MachineAssignment');

const Employee = require('../models/Employee');



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

exports.assignMachineToEmployees = async (req, res) => {
  try {
    const { machineId, employeeIds } = req.body;

    // Step 2a: Validate input
    if (!machineId || !employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        statusCode:400,
        success: false,
        message: "Machine ID and array of Employee IDs are required"
      });
    }

    // Step 2b: Check machine exists
    const machine = await Machine.findById(machineId);
    if (!machine) return res.status(404).json({ statusCode: 404, success: false, message: "Machine not found" });

    // Step 2c: Check all employees exist
    const employees = await Employee.find({ _id: { $in: employeeIds } });
    if (employees.length !== employeeIds.length) {
      return res.status(404).json({statusCode: 404, success: false, message: "Some employees not found" });
    }

    // Step 2d: Create assignment
    let assignment = await MachineAssignment.create({
      machine: machineId,
      employees: employeeIds
    });


    // Step 2e: Populate machine and employee details
   
    const populatedAssignment = await MachineAssignment.findById(assignment._id)
      .populate({ path: 'machine', select: 'name type' })
      .populate({ path: 'employees', select: 'name role' });

    res.status(201).json({
       statusCode: 201,
      success: true,
      message: 'Machine assigned successfully',
      data: populatedAssignment
    });

  } catch (error) {
    console.error("Assign Machine Error:", error);
    res.status(500).json({
       statusCode: 500, success: false, message: "Server error while assigning machine" });
  }
};


