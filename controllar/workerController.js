const Worker = require('../models/Worker');
const Employee = require('../models/Employee');
const Machine = require('../models/Machine');
const Item = require('../models/item.model'); 

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

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Create worker entry with machine and item as strings
    const worker = new Worker({
      time,
      shift,
      frameLength,
      numberOfBox,
      boxWeight,
      frameWeight,
      description,
      employee: employeeId,
      machine: machineName,  // storing string
      item: itemName         // storing string
    });

    const savedWorker = await worker.save();

    res.status(201).json(savedWorker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.updateWorker = async (req, res) => {
  try {
    const workerId = req.params.id;

    const { 
      time, 
      shift, 
      frameLength, 
      numberOfBox, 
      boxWeight, 
      frameWeight, 
      description, 
      employeeId, 
      machineId, 
      itemId 
    } = req.body;

    // Check if worker exists
    const existingWorker = await Worker.findById(workerId);
    if (!existingWorker) {
      return res.status(404).json({
        success: false,
        message: "Worker entry not found"
      });
    }

    // Validate employee (if provided)
   if (req.body.employeeId && req.body.employeeId.trim() === "") {
   return res.status(400).json({ success: false, message: "Invalid employeeId" });
}


    // Validate machine (if provided)
    if (machineId) {
      const machine = await Machine.findById(machineId);
      if (!machine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found"
        });
      }
    }

    // Validate item (if provided)
    if (itemId) {
      const item = await Item.findById(itemId);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
    }

    // Build update object (only update provided fields)
    const updateData = {
      ...(time && { time }),
      ...(shift && { shift }),
      ...(frameLength && { frameLength }),
      ...(numberOfBox && { numberOfBox }),
      ...(boxWeight && { boxWeight }),
      ...(frameWeight && { frameWeight }),
      ...(description && { description }),
      ...(employeeId && { employee: employeeId }),
      ...(machineId && { machine: machineId }),
      ...(itemId && { item: itemId })
    };

    // Update worker
    const updatedWorker = await Worker.findByIdAndUpdate(
      workerId,
      updateData,
      { new: true }
    )
      .populate("employee", "name")
      .populate("machine", "name")
      .populate("item", "name");

    res.status(200).json({
      success: true,
      message: "Worker updated successfully",
      data: updatedWorker
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
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
