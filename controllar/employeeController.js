const Employee = require('../models/Employee');
const { uploadBufferToGCS } = require('../utils/gcloud');

/**
 * Generates a robust Employee ID (EID).
 * If DOB is provided, it uses your original logic.
 * If DOB is missing, it uses the current date and adds a random part for uniqueness.
 */
function generateEid(dob) {
  const date = dob ? new Date(dob) : new Date(); // Use current date as a fallback
  if (isNaN(date.getTime())) {
    // If an invalid date string was passed, fallback to current date
    date = new Date();
  }
  
  const year = date.getFullYear() + (dob ? 1 : 0); // Only add +1 if DOB was provided
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const yearSuffix = year.toString().slice(-2);
  
  // If DOB was missing, add a random 2-digit number to avoid collisions
  const randomPart = !dob ? Math.floor(10 + Math.random() * 90) : '';

  return `${month}${yearSuffix}${randomPart}`;
}

/**
 * Generates a robust password.
 * Uses the first 4 letters of the name.
 * Uses the last 4 digits of the Adhar number if it exists.
 * Otherwise, it uses the last 4 digits of the mobile number as a reliable fallback.
 */
function generatePassword(name, adhar, mobile) {
  const namePart = name.slice(0, 4).toLowerCase();
  
  // Use last 4 of Adhar if available, otherwise use last 4 of mobile
  const numericPart = adhar ? adhar.slice(-4) : mobile.slice(-4);
  
  return `${namePart}${numericPart}`;
}

exports.createEmployee = async (req, res) => {
  try {
    const { name, mobile, role, dob, adharNumber } = req.body;

    // --- Added stricter validation for required fields ---
    if (!name || !mobile || !role) {
      return res.status(400).json({ message: 'Name, Mobile, and Role are required.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Adhar image is required.' });
    }

    const existingEmployee = await Employee.findOne({ mobile });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Mobile number already exists.' });
    }

    // --- Safely handle optional Date of Birth ---
    const dobDate = dob ? new Date(dob) : null;
    if (dob && isNaN(dobDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date of birth format.' });
    }

    // --- Generate credentials using robust functions ---
    const eid = generateEid(dob);
    const password = generatePassword(name, adharNumber, mobile); // Pass mobile as a fallback

    const { url: adharImageUrl } = await uploadBufferToGCS(
      req.file.buffer,
      req.file.originalname,
      'adhar-images',
      req.file.mimetype
    );

    // --- Create employee with safe values ---
    const employee = await Employee.create({
      name,
      mobile,
      role,
      dob: dobDate, // This will be null if not provided, which is safe
      eid,
      password,
      adharNumber: adharNumber || '', // Save as empty string if not provided
      adharImageUrl,
    });

    // --- Send a successful response with the password ---
    res.status(201).json({
      message: "Employee created successfully",
      password: employee.password,
      employee: employee,
    });

  } catch (error) {
    // This block catches any other unexpected errors
    console.error('Create Employee Error:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to create employee due to a server error.' });
  }
};


exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expecting true/false

    if (typeof status !== 'boolean') {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: "Status must be a boolean value (true for active, false for inactive)."
      });
    }

    // Find employee
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        message: "Employee not found."
      });
    }

    // Update status and log history
    employee.status = status;
    employee.statusHistory = employee.statusHistory || [];
    employee.statusHistory.push({
      status,
      changedAt: new Date()
    });

    await employee.save();

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: `Employee status updated to ${status ? 'active' : 'inactive'}.`,
      employee
    });

  } catch (error) {
    console.error('Update Employee Status Error:', error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: "Failed to update employee status.",
      error: error.message
    });
  }
};





exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const updateData = req.body;
    if (req.file) {
      const adharImageUrl = await uploadBufferToGCS(req.file.buffer, req.file.originalname, 'adhar-images');
      updateData.adharImageUrl = adharImageUrl;
    }
    const employee = await Employee.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { name, mobile, role, otherRole, dob, adharNumber } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    let adharImageUrl = employee.adharImageUrl;
    if (req.file) {
      adharImageUrl = await uploadBufferToGCS(req.file.buffer, req.file.originalname, 'adhar-images');
    }

    const eid = generateEid(dob);
    const password = generatePassword(name, adharNumber);

    employee.set({
      name,
      mobile,
      role,
      otherRole: role === 'Other' ? otherRole : undefined,
      dob,
      eid,
      password,
      adharNumber,
      adharImageUrl,
    });

    await employee.save();
    res.json(employee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};
