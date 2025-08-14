const Employee = require('../models/Employee');
const { uploadBufferToGCS } = require('../utils/gcloud');

function generateEid(dob) {
  const date = new Date(dob);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear() + 1; // Assuming your logic here is correct
  const yearSuffix = year.toString().slice(-2);
  return `${month}${yearSuffix}`;
}

function generatePassword(name, adhar) {
  // Add a check for missing adhar to prevent errors
  if (!name || !adhar) {
    // Return a default or throw an error
    return 'default1234'; 
  }
  const namePart = name.slice(0, 4).toLowerCase();
  const adharPart = adhar.slice(-4);
  return `${namePart}${adharPart}`;
}

exports.createEmployee = async (req, res) => {
  try {
    // --- CHANGE 1: Remove 'otherRole' from here ---
    const { name, mobile, role, dob, adharNumber } = req.body;

    // --- CHANGE 2: The validation for 'otherRole' is no longer needed. REMOVED. ---
    // The frontend already ensures a 'role' is submitted.

    if (!req.file) {
      // You may want to make the image optional if it's not always required
      return res.status(400).json({ message: 'Adhar image is required' });
    }

    const existingEmployee = await Employee.findOne({ mobile });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Mobile number already exists' });
    }

    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date of birth format' });
    }

    const eid = generateEid(dob);
    const password = generatePassword(name, adharNumber);

    const { url: adharImageUrl } = await uploadBufferToGCS(
      req.file.buffer,
      req.file.originalname,
      'adhar-images',
      req.file.mimetype
    );

    // --- CHANGE 3: Simplified employee object creation ---
    const employee = await Employee.create({
      name,
      mobile,
      role, // The 'role' from the request now correctly holds "Supervisor", "Operator", etc.
      dob: dobDate,
      eid,
      password,
      adharNumber,
      adharImageUrl,
      // The 'otherRole' field is no longer needed here.
      // If your Mongoose model requires it, you can remove it from the schema.
    });

    // --- CHANGE 4: Send a response that includes the password for the frontend popup ---
    res.status(201).json({
      message: "Employee created successfully",
      password: employee.password, // Explicitly send the password
      employee: employee, // You can also send the full employee object if needed
    });

  } catch (error) {
    console.error('Create Employee Error:', error.message, error.stack);
    // Send back a more user-friendly error message
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
