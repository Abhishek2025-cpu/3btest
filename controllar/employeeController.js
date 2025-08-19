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

/**
 * Updates an existing employee's details.
 * EID is considered immutable and is not changed.
 * Password is regenerated if relevant details (name, adhar, mobile) change.
 */
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, role, dob, adharNumber } = req.body;

    // 1. Find the employee to update
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // 2. Validate inputs
    // Check if the new mobile number is already taken by another employee
    if (mobile && mobile !== employee.mobile) {
      const existingEmployee = await Employee.findOne({ mobile, _id: { $ne: id } });
      if (existingEmployee) {
        return res.status(400).json({ message: 'This mobile number is already in use by another employee.' });
      }
    }

    // Safely handle optional Date of Birth
    let dobDate = employee.dob; // Default to existing DOB
    if (dob) { // If a new DOB is provided in the request
        const parsedDate = new Date(dob);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date of birth format.' });
        }
        dobDate = parsedDate;
    }

    // 3. Handle Adhar Image Upload (if a new file is provided)
    let adharImageUrl = employee.adharImageUrl; // Default to the existing image URL
    if (req.file) {
      const { url } = await uploadBufferToGCS(
        req.file.buffer,
        req.file.originalname,
        'adhar-images',
        req.file.mimetype // Pass mimetype for consistency
      );
      adharImageUrl = url;
    }

    // 4. Regenerate password with potentially updated information
    // Use new data if provided, otherwise fall back to existing employee data
    const updatedName = name || employee.name;
    const updatedAdhar = adharNumber || employee.adharNumber;
    const updatedMobile = mobile || employee.mobile;
    const newPassword = generatePassword(updatedName, updatedAdhar, updatedMobile);

    // 5. Update employee fields with new data, falling back to existing data
    employee.name = name || employee.name;
    employee.mobile = mobile || employee.mobile;
    employee.role = role || employee.role;
    employee.dob = dobDate;
    employee.adharNumber = adharNumber || employee.adharNumber;
    employee.adharImageUrl = adharImageUrl;
    employee.password = newPassword; // Always update the password to reflect current details

    // Note: EID is NOT updated, preserving it as a stable identifier.

    await employee.save();

    // 6. Send a successful response
    res.status(200).json({
      message: "Employee updated successfully",
      // It's good practice to inform the admin of the new password
      newPassword: employee.password, 
      employee: employee,
    });

  } catch (error) {
    // Consistent, robust error handling
    console.error('Update Employee Error:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to update employee due to a server error.' });
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


/**
 * Login an employee using mobile number and password.
 * @route POST /api/employees/login
 */
exports.loginEmployee = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    // 1. Validate input
    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and password are required.',
      });
    }

    // 2. Find employee by mobile number
    const employee = await Employee.findOne({ mobile });

    // 3. Check if employee exists and if the password is correct
    // NOTE: In a real-world application, passwords should be hashed using a library
    // like bcrypt. This is a simple string comparison based on your current setup.
    if (!employee || employee.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid mobile number or password.',
      });
    }

    // 4. Check if the employee's account is active (based on your `updateEmployeeStatus` logic)
    if (employee.status === false) { // Explicitly check for false
      return res.status(403).json({ // 403 Forbidden is more appropriate here
        success: false,
        message: 'Your account is inactive. Please contact the administrator.',
      });
    }

    // 5. Successful login: Return employee details
    // It's good practice to not send the password back in the response.
    const employeeData = employee.toObject();
    delete employeeData.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      employee: employeeData, // This object contains all details, including the role
    });

  } catch (error) {
    console.error('Login Employee Error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred during login.',
    });
  }
};