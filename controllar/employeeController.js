
const { uploadBufferToGCS } = require('../utils/gcloud');



const Employee = require('../models/Employee');
const axios = require('axios');
const jwt = require("jsonwebtoken");
const crypto = require("crypto");




function generateEid() {
  // EID = 3B + 4 random digits
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `3B${random4}`;
}

function generatePassword(name, adhar) {
  const namePart = (name || '').slice(0, 4).toLowerCase();
  const adharPart = (adhar || '').slice(0, 4); // FIRST 4 digits

  return `${namePart}${adharPart}`;
}



exports.createEmployee = async (req, res) => {
  try {
    const { name, mobile, dob, adharNumber, roles } = req.body;

    if (!name || !mobile || !roles || roles.length === 0) {
      return res.status(400).json({
        message: "Name, Mobile and at least one role are required."
      });
    }

    // Aadhaar required
    if (!req.files || !req.files.adharImage) {
      return res.status(400).json({ message: "Adhar image is required." });
    }

    const existingEmployee = await Employee.findOne({ mobile });
    if (existingEmployee) {
      return res.status(400).json({ message: "Mobile number already exists." });
    }

    const dobDate = dob ? new Date(dob) : null;
    if (dob && isNaN(dobDate.getTime())) {
      return res.status(400).json({ message: "Invalid DOB format." });
    }

    // Upload Aadhaar
    const adharFile = req.files.adharImage[0];
    const adharUpload = await uploadBufferToGCS(
      adharFile.buffer,
      adharFile.originalname,
      "adhar-images",
      adharFile.mimetype
    );

    // Optional profile pic
    let profilePic = null;
    if (req.files.profilePic) {
      const profileFile = req.files.profilePic[0];
      const profileUpload = await uploadBufferToGCS(
        profileFile.buffer,
        profileFile.originalname,
        "employee/profile-pics",
        profileFile.mimetype
      );

      profilePic = {
        url: profileUpload.url,
        fileId: profileUpload.id
      };
    }

    // 🔐 Generate credentials for each role
    const roleAccounts = roles.map(role => ({
      role,
      eid: generateEid(),
      password: generatePassword(name, adharNumber)
    }));

    const employee = await Employee.create({
      name,
      mobile,
      dob: dobDate,
      adharNumber: adharNumber || "",
      adharImageUrl: adharUpload.url,
      profilePic,
      roles: roleAccounts
    });

    res.status(201).json({
      message: "Employee created successfully",
      credentials: employee.roles.map(r => ({
        role: r.role,
        eid: r.eid,
        password: r.password
      })),
      employee
    });

  } catch (error) {
    console.error("Create Employee Error:", error);
    res.status(500).json({
      message: "Failed to create employee due to a server error."
    });
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
    const { name, mobile, role, dob, adharNumber, password } = req.body;

    // 1. Find the employee to update
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // 2. Validate mobile number (only if changed)
    if (mobile && mobile !== employee.mobile) {
      const existingEmployee = await Employee.findOne({ mobile, _id: { $ne: id } });
      if (existingEmployee) {
        return res.status(400).json({ message: 'This mobile number is already in use by another employee.' });
      }
    }

    // 3. Handle DOB safely
    let dobDate = employee.dob;
    if (dob) {
      const parsedDate = new Date(dob);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date of birth format.' });
      }
      dobDate = parsedDate;
    }

    // 4. Handle Adhar Image Upload
    let adharImageUrl = employee.adharImageUrl;
    if (req.file) {
      const { url } = await uploadBufferToGCS(
        req.file.buffer,
        req.file.originalname,
        'adhar-images',
        req.file.mimetype
      );
      adharImageUrl = url;
    }

    // 5. If password is provided, use it, else regenerate automatically
    let finalPassword = password;
    if (!password) {
      const updatedName = name || employee.name;
      const updatedAdhar = adharNumber || employee.adharNumber;
      const updatedMobile = mobile || employee.mobile;

      finalPassword = generatePassword(updatedName, updatedAdhar, updatedMobile);
    }

    // 6. Update fields
    employee.name = name || employee.name;
    employee.mobile = mobile || employee.mobile;
    employee.role = role || employee.role;
    employee.dob = dobDate;
    employee.adharNumber = adharNumber || employee.adharNumber;
    employee.adharImageUrl = adharImageUrl;
    employee.password = finalPassword; // <-- updating password manually if given

    await employee.save();

    res.status(200).json({
      message: "Employee updated successfully",
      newPassword: employee.password,
      employee: employee,
    });

  } catch (error) {
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



const JWT_SECRET = crypto.randomBytes(32).toString("hex");

exports.loginEmployee = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and password are required.',
      });
    }

    const employee = await Employee.findOne({ mobile });

    if (!employee || employee.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid mobile number or password.',
      });
    }

    if (employee.status === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact the administrator.',
      });
    }

    // FIXED: use JWT_SECRET instead of process.env.JWT_SECRET
    const token = jwt.sign(
      {
        id: employee._id,
        mobile: employee.mobile,
        role: employee.role,
      },
      JWT_SECRET, 
      { expiresIn: "7d" }
    );

    const employeeData = {
      _id: employee._id,
      name: employee.name,
      role: employee.role,
      mobile: employee.mobile,
      eid: employee.eid
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      employee: employeeData
    });

  } catch (error) {
    console.error('Login Employee Error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred during login.',
    });
  }
};

