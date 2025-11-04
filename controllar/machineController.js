const Machine = require("../models/Machine");
const Employee = require("../models/Employee");
const cloudinary = require("cloudinary").v2;

const sharp = require('sharp');

const MachineAssignment = require('../models/MachineAssignment');

const { Storage } = require("@google-cloud/storage");

const storage = new Storage(); 
const BUCKET_NAME = "3bprofiles-products";
const bucket = storage.bucket(BUCKET_NAME);


async function uploadBufferToGCS(buffer, filename, folder, mimetype = "application/octet-stream") {
  try {
    const uniqueName = `${Date.now()}-${filename}`;
    const filePath = `${folder}/${uniqueName}`;
    const file = bucket.file(filePath);

    await file.save(buffer, {
      resumable: false,
      contentType: mimetype,
      // ⚠️ Removed 'public: true' (caused ACL issue)
    });


    return {
      url: `https://storage.googleapis.com/${bucket.name}/${filePath}`,
      id: filePath,
    };
  } catch (gcsError) {
    console.error(`❌ GCS Upload Error for file '${filename}':`, gcsError);
    throw new Error(`GCS upload failed for ${filename}: ${gcsError.message}`);
  }
}





// --- Machine Controller Logic ---
exports.assignMachineWithOperator = async (req, res) => {
  try {
    console.log("--- Starting assignMachineWithOperator ---");
    console.log("🔸 Initial req.body:", req.body);
    console.log("🔸 Initial req.files:", req.files); // req.files will be an array if using Multer properly

    let { machineId, employeeIds, mainItemId, shift, operatorTable } = req.body;

    // --- 1. Parse employeeIds ---
    if (!employeeIds) {
      console.warn("⚠️ employeeIds is missing in request body.");
      return res.status(400).json({ success: false, message: "Employee IDs are required." });
    }
    if (typeof employeeIds === "string") {
      employeeIds = employeeIds.split(",").map(id => id.trim()).filter(id => id !== ''); // Filter out empty strings
    }
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      console.error("❌ Parsed employeeIds is not a valid array or is empty:", employeeIds);
      return res.status(400).json({ success: false, message: "Invalid or empty Employee IDs provided." });
    }
    console.log("✅ Parsed employeeIds:", employeeIds);

    // --- 2. Parse operatorTable JSON ---
    let parsedOperatorTable = [];
    if (!operatorTable) {
      console.warn("⚠️ operatorTable is missing in request body. Using empty array.");
    } else if (typeof operatorTable !== "string") {
      console.error("❌ operatorTable is not a string. Received type:", typeof operatorTable);
      return res.status(400).json({ success: false, message: "operatorTable must be a JSON string." });
    } else {
      try {
        parsedOperatorTable = JSON.parse(operatorTable);
        if (!Array.isArray(parsedOperatorTable)) {
           console.error("❌ Parsed operatorTable is not an array:", parsedOperatorTable);
           return res.status(400).json({ success: false, message: "Parsed operatorTable must be an array." });
        }
      } catch (err) {
        console.error("❌ Failed to parse operatorTable JSON:", err.message);
        return res.status(400).json({ success: false, message: `Invalid operatorTable JSON format: ${err.message}` });
      }
    }
    console.log("✅ Parsed operatorTable:", parsedOperatorTable);

    // --- 3. Handle Operator Images Upload ---
    const operatorImages = [];
    if (req.files && req.files.length > 0) {
      console.log(`Attempting to upload ${req.files.length} files...`);
      const filesToUpload = req.files.slice(0, 2); // max 2
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        console.log(`Processing file ${i + 1}: ${file.originalname}, size: ${file.size} bytes`);
        try {
          const compressedBuffer = await sharp(file.buffer)
            .resize({ width: 1000, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
          console.log(`Sharp compression successful for ${file.originalname}.`);

          const uploadResult = await uploadBufferToGCS(compressedBuffer, file.originalname, 'operator-table', file.mimetype);
          operatorImages.push(uploadResult.url);
          console.log(`✅ Uploaded operator image:`, uploadResult.url);
        } catch (fileUploadError) {
          console.error(`❌ Error processing or uploading file ${file.originalname}:`, fileUploadError);
          // Decide: should this be a hard fail (500) or continue with other images?
          // For now, re-throwing will cause a 500 for the whole request.
          return res.status(500).json({ success: false, message: `Error uploading image ${file.originalname}: ${fileUploadError.message}` });
        }
      }
    } else {
      console.log("No operator images found in request.");
    }

    // --- 4. Create Machine Assignment in DB ---
    let assignment;
    try {
      const assignmentData = {
        machine: machineId,
        employees: employeeIds,
        mainItem: mainItemId,
        shift,
        operatorTable: parsedOperatorTable,
        operatorImages
      };
      console.log("Attempting to create MachineAssignment with data:", assignmentData);
      assignment = await MachineAssignment.create(assignmentData);
      console.log("✅ MachineAssignment created successfully with ID:", assignment._id);
    } catch (dbCreateError) {
      console.error("❌ Database Create Error (MachineAssignment):", dbCreateError);
      // This is often a Mongoose validation or casting error
      if (dbCreateError.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: `Validation Error: ${dbCreateError.message}` });
      }
      if (dbCreateError.name === 'CastError') {
         return res.status(400).json({ success: false, message: `Data Casting Error: Invalid ID or type for field ${dbCreateError.path}` });
      }
      throw new Error(`Failed to create assignment in database: ${dbCreateError.message}`);
    }

    // --- 5. Populate Assignment for Response ---
    let populatedAssignment;
    try {
      populatedAssignment = await MachineAssignment.findById(assignment._id)
        .populate({ path: 'machine', select: 'name type' })
        .populate({ path: 'employees', select: 'name role' })
        .populate({ path: 'mainItem' });
      console.log("✅ MachineAssignment populated successfully.");
    } catch (populateError) {
      console.error("❌ Database Populate Error (MachineAssignment):", populateError);
      throw new Error(`Failed to populate assignment for response: ${populateError.message}`);
    }

    // --- 6. Send Success Response ---
    res.status(201).json({
      success: true,
      message: "Machine assigned successfully with operator table and images",
      data: populatedAssignment
    });

  } catch (error) {
    // Catch-all for any uncaught errors during the process
    console.error("--- ❌ assignMachineWithOperator Final Catch Error ---");
    console.error("❌ Error during assignMachineWithOperator execution:", error);
    res.status(500).json({ success: false, message: `Server error while assigning machine: ${error.message || error}` });
  } finally {
    console.log("--- Finished assignMachineWithOperator ---");
  }
};





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
// exports.assignMachineWithOperator = async (req, res) => {
//   try {
//     console.log("🔹 req.body:", req.body);
//     console.log("🔹 req.files:", req.files);

//     let { machineId, employeeIds, mainItemId, shift, operatorTable } = req.body;

//     // Parse employeeIds
//     if (employeeIds && typeof employeeIds === "string") {
//       employeeIds = employeeIds.split(",").map(id => id.trim());
//     }

//     // Parse operatorTable JSON
//     try {
//       operatorTable = operatorTable ? JSON.parse(operatorTable) : [];
//     } catch (err) {
//       console.error("❌ Failed to parse operatorTable JSON:", err);
//       operatorTable = [];
//     }

//     // Upload max 2 images
//     const operatorImages = [];
//     if (req.files && req.files.length > 0) {
//       const filesToUpload = req.files.slice(0, 2); // max 2
//       for (let i = 0; i < filesToUpload.length; i++) {
//         const file = filesToUpload[i];
//         const compressedBuffer = await sharp(file.buffer)
//           .resize({ width: 1000, withoutEnlargement: true })
//           .jpeg({ quality: 80 })
//           .toBuffer();

//         const filename = `operator-${Date.now()}-${file.originalname}`;
//         const uploadResult = await uploadBufferToGCS(compressedBuffer, filename, 'operator-table');
//         operatorImages.push(uploadResult.url);
//         console.log(`✅ Uploaded operator image:`, uploadResult.url);
//       }
//     }

//     // Create assignment
//     const assignment = await MachineAssignment.create({
//       machine: machineId,
//       employees: employeeIds,
//       mainItem: mainItemId,
//       shift,
//       operatorTable,
//       operatorImages
//     });

//     const populatedAssignment = await MachineAssignment.findById(assignment._id)
//       .populate({ path: 'machine', select: 'name type' })
//       .populate({ path: 'employees', select: 'name role' })
//       .populate({ path: 'mainItem' });

//     res.status(201).json({
//       success: true,
//       message: "Machine assigned successfully with operator table and images",
//       data: populatedAssignment
//     });

//   } catch (error) {
//     console.error("❌ Assign Machine Error:", error);
//     res.status(500).json({ success: false, message: "Server error while assigning machine" });
//   }
// };




// GET /api/assignments/employee/:employeeId
// Fetch assignments for a single employee by employee _id
exports.getAssignmentsByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID is required." });
    }
const mongoose = require("mongoose");
const assignments = await MachineAssignment.find({
  employees: new mongoose.Types.ObjectId(employeeId)
})

      .populate({ path: "machine", select: "name type" })
      .populate({ path: "employees", select: "name role" })
      .populate({ path: "mainItem" })
      .sort({ createdAt: -1 });

    if (!assignments || assignments.length === 0) {
      return res.status(404).json({ success: false, message: "No assignments found for this employee." });
    }

    res.status(200).json({
      success: true,
      message: "Assignments fetched successfully for employee.",
      data: assignments
    });
  } catch (error) {
    console.error("❌ Error fetching assignments by employee ID:", error);
    res.status(500).json({
      success: false,
      message: `Server error while fetching assignments: ${error.message}`
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
      .populate({ path: "machine", select: "name type" })
      .populate({ path: "employees", select: "name role" })
      .populate({ path: "mainItem" })
      .sort({ createdAt: -1 });

    if (!assignments || assignments.length === 0) {
      return res.status(404).json({ success: false, message: "No assignments found." });
    }

    res.status(200).json({
      success: true,
      message: "All machine assignments fetched successfully.",
      data: assignments
    });
  } catch (error) {
    console.error("❌ Error fetching all assignments:", error);
    res.status(500).json({
      success: false,
      message: `Server error while fetching assignments: ${error.message}`
    });
  }
};

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
