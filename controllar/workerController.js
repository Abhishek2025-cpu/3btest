const Worker = require('../models/Worker');
const Employee = require('../models/Employee');

// Create a new worker entry
exports.createWorker = async (req, res) => {
  try {
    const { time, shift, frameLength, numberOfBox, boxWeight, frameWeight, description, employeeId } = req.body;

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const worker = new Worker({
      time,
      shift,
      frameLength,
      numberOfBox,
      boxWeight,
      frameWeight,
      description,
      employee: employeeId
    });

    const savedWorker = await worker.save();
    res.status(201).json(savedWorker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all workers
exports.getAllWorkers = async (req, res) => {
  try {
    const workers = await Worker.find().populate('employee', 'name mobile role');
    res.json(workers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single worker by ID
exports.getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id).populate('employee', 'name mobile role');
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    res.json(worker);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
