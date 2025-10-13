const Machine = require("../models/Machine");
const Employee = require("../models/Employee");
const cloudinary = require("cloudinary").v2;

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

exports.assignMachineToEmployees = async (req, res) => {
  try {
    const { machineId, employeeIds, mainItemId } = req.body;

    // Step 2a: Validate input
    if (!machineId || !employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0 || !mainItemId) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: "Machine ID, Main Item ID, and array of Employee IDs are required"
      });
    }


    // Step 2b: Check machine exists
    const machine = await Machine.findById(machineId);
    if (!machine) return res.status(404).json({ statusCode: 404, success: false, message: "Machine not found" });

    // Step 2c: Check all employees exist
    const employees = await Employee.find({ _id: { $in: employeeIds } });
    if (employees.length !== employeeIds.length) {
      return res.status(404).json({ statusCode: 404, success: false, message: "Some employees not found" });
    }


    // ---Create main item exists--

    const mainItem = await MainItem.findById(mainItemId);

    if (!mainItem) return res.status(404).json({
      statusCode: 404, success: false,
      message: "Main Item not Found"
    });


    // Step 2d: Create assignment
    let assignment = await MachineAssignment.create({
      machine: machineId,
      employees: employeeIds,
      mainItem: mainItemId
    });


    // Step 2e: Populate machine and employee details

    const populatedAssignment = await MachineAssignment.findById(assignment._id)
      .populate({ path: 'machine', select: 'name type' })
      .populate({ path: 'employees', select: 'name role' })
      .populate({ path: 'mainItem' }); // populate all mainItem details

    res.status(201).json({
      statusCode: 201,
      success: true,
      message: 'Machine assigned successfully with main item details',
      data: populatedAssignment
    });

  } catch (error) {
    console.error("Assign Machine Error:", error);
    res.status(500).json({
      statusCode: 500, success: false, message: "Server error while assigning machine"
    });
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



exports.assignMachineWithOperator = async (req, res) => {
  try {
    let { machineId, employeeIds, mainItemId, shift, operatorTable } = req.body;

    // Convert employeeIds to array if string
    employeeIds = typeof employeeIds === 'string' ? employeeIds.split(',') : employeeIds;

    // Parse operatorTable JSON string to object
    operatorTable = operatorTable ? JSON.parse(operatorTable) : [];

    // Validate required fields
    if (!machineId || !mainItemId || !employeeIds.length || !shift) {
      return res.status(400).json({
        success: false,
        message: "Machine ID, Main Item ID, Employee IDs array, and shift are required"
      });
    }

    // Check machine, employees, mainItem
    const machine = await Machine.findById(machineId);
    if (!machine) return res.status(404).json({ success: false, message: "Machine not found" });

    const employees = await Employee.find({ _id: { $in: employeeIds } });
    if (employees.length !== employeeIds.length) return res.status(404).json({ success: false, message: "Some employees not found" });

    const mainItem = await MainItem.findById(mainItemId);
    if (!mainItem) return res.status(404).json({ success: false, message: "Main item not found" });

    // Upload operator images to Cloudinary
    let processedOperatorTable = [];
    if (operatorTable.length > 0) {
      for (let i = 0; i < operatorTable.length; i++) {
        let operator = operatorTable[i];
        let imageUrl = null;

        if (req.files && req.files[i]) {
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "operatorTable" },
              (err, result) => err ? reject(err) : resolve(result)
            );
            stream.end(req.files[i].buffer);
          });
          imageUrl = result.secure_url;
        }

        processedOperatorTable.push({
          ...operator,
          image: imageUrl || operator.image || null
        });
      }
    }

    // Create MachineAssignment
    const assignment = await MachineAssignment.create({
      machine: machineId,
      employees,
      mainItem: mainItemId,
      shift,
      operatorTable: processedOperatorTable
    });

    // Populate response
    const populatedAssignment = await MachineAssignment.findById(assignment._id)
      .populate({ path: 'machine', select: 'name type' })
      .populate({ path: 'employees', select: 'name role' })
      .populate({ path: 'mainItem' });

    res.status(201).json({
      success: true,
      message: "Machine assigned successfully with operator table",
      data: populatedAssignment
    });

  } catch (error) {
    console.error("Assign Machine Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




// 👉 Get assignments by employee ID
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
