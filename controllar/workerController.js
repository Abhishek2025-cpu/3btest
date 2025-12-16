const Worker = require('../models/Worker');
const Employee = require('../models/Employee');
const Machine = require('../models/Machine');
const Item = require('../models/item.model'); 
const { uploadBufferToGCS } = require("../utils/gcloud");


// Create a new worker entry
// controller
exports.createWorker = async (req, res) => {
  try {
    const {
      time,
      shift,
      frameLength,
      numberOfBox,
      boxWeight,
      frameWeight,
      description,
      employeeId,
      machineName,
      itemName
    } = req.body;

    // ✅ Check employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    let selfieData = null;

    // ✅ Optional file upload
    if (req.file) {
      const uploaded = await uploadBufferToGCS(
        req.file.buffer,
        req.file.originalname,
        "workers/selfies",
        req.file.mimetype
      );

      selfieData = {
        url: uploaded.url,
        fileId: uploaded.id
      };
    }

    const worker = new Worker({
      time,
      shift,
      frameLength,
      numberOfBox,
      boxWeight,
      frameWeight,
      description,
      employee: employeeId,
      machine: machineName,
      item: itemName,
      selfie: selfieData
    });

    const savedWorker = await worker.save();

    res.status(201).json(savedWorker);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


exports.updateWorker = async (req, res) => {
  try {
    const workerId = req.params.id;
    const updateData = req.body;

    // 1. Update the worker
    // 2. .populate() tells Mongoose: "Go to the Employee collection and replace these IDs with the actual data"
    const updatedWorker = await Worker.findByIdAndUpdate(
      workerId,
      updateData,
      { new: true } // Returns the updated document
    )
    .populate("updatedBy", "name role _id") // Changes 'updatedBy' ID -> Object { name, role }
    .populate("employee", "name role _id"); // Changes 'employee' ID -> Object { name, role }

    if (!updatedWorker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    // Now updatedWorker contains the full details inside it
    return res.status(200).json(updatedWorker);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



// Get all workers
// ✅ Utility for uniform responses
const sendResponse = (res, success, statusCode, message, data = null) => {
  res.status(statusCode).json({
    success,
    statusCode,
    message,
    data,
  });
};

// Get all workers
exports.getAllWorkers = async (req, res) => {
  try {
    const workers = await Worker.find()
      .populate('employee', 'name mobile role')
      .populate('machine', 'name')
      .populate('item', 'itemNo length');

    if (!workers || workers.length === 0) {
      return sendResponse(res, false, 404, 'No workers found');
    }

    sendResponse(res, true, 200, 'Workers fetched successfully', workers);
  } catch (error) {
    sendResponse(res, false, 500, error.message);
  }
};

// Get worker by worker ID
exports.getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id)
      .populate('employee', 'name mobile role')
      .populate('machine', 'name')
      .populate('item', 'itemNo length');

    if (!worker) {
      return sendResponse(res, false, 404, 'Worker not found');
    }

    sendResponse(res, true, 200, 'Worker fetched successfully', worker);
  } catch (error) {
    sendResponse(res, false, 500, error.message);
  }
};

// Get workers by employee ID
exports.getWorkersByEmployeeId = async (req, res) => {
  try {
    const { id } = req.params;

    const workers = await Worker.find({ employee: id })
      .populate('employee', 'name mobile role')
      .populate('machine', 'name')
      .populate('item', 'itemNo length');

    if (!workers || workers.length === 0) {
      return sendResponse(res, false, 404, 'No workers found for this employee');
    }

    sendResponse(res, true, 200, 'Employee tasks fetched successfully', workers);
  } catch (error) {
    sendResponse(res, false, 500, error.message);
  }
};


// Update worker by ID
exports.updateWorker = async (req, res) => {
  try {
    const updatedWorker = await Worker.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedWorker) return res.status(404).json({ message: 'Worker not found' });
    res.json(updatedWorker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete worker by ID
exports.deleteWorker = async (req, res) => {
  try {
    const deletedWorker = await Worker.findByIdAndDelete(req.params.id);
    if (!deletedWorker) return res.status(404).json({ message: 'Worker not found' });
    res.json({ message: 'Worker deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
