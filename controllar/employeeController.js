
const { uploadBufferToGCS } = require('../utils/gcloud');



const Employee = require('../models/Employee');
const axios = require('axios');
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");




function generateEid() {
  // Safer EID (low collision)
  return `3B${Date.now().toString().slice(-4)}`;
}

function generatePassword(name, adhar) {
  name = (name || '').toLowerCase();

  let namePart = '';
  let i = 0;

  while (namePart.length < 4 && i < name.length) {
    if (name[i] !== ' ') {
      namePart += name[i];
    }
    i++;
  }

  const adharPart = (adhar || '').slice(0, 4);
  return `${namePart}${adharPart}`;
}

exports.createEmployee = async (req, res) => {
  try {
    let { name, mobile, dob, adharNumber, roles } = req.body;

    /* -------------------- BASIC VALIDATION -------------------- */
    if (!name || !mobile || !roles) {
      return res.status(400).json({
        message: "Name, Mobile and Roles are required."
      });
    }

    /* -------------------- ROLES PARSING -------------------- */
    if (typeof roles === "string") {
      try {
        roles = JSON.parse(roles);
      } catch {
        roles = [roles];
      }
    }

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({
        message: "Roles must be a non-empty array."
      });
    }

    /* -------------------- FILE VALIDATION -------------------- */
    if (!req.files?.adharImage?.length) {
      return res.status(400).json({
        message: "Adhar image is required."
      });
    }

    /* -------------------- DUPLICATE CHECK -------------------- */
    const existingEmployee = await Employee.findOne({ mobile });
    if (existingEmployee) {
      return res.status(400).json({
        message: "Mobile number already exists."
      });
    }

    /* -------------------- DOB VALIDATION -------------------- */
    let dobDate = null;
    if (dob) {
      dobDate = new Date(dob);
      if (isNaN(dobDate.getTime())) {
        return res.status(400).json({
          message: "Invalid DOB format."
        });
      }
    }

    /* -------------------- UPLOAD ADHAR -------------------- */
    const adharFile = req.files.adharImage[0];
    const adharUpload = await uploadBufferToGCS(
      adharFile.buffer,
      adharFile.originalname,
      "adhar-images",
      adharFile.mimetype
    );

    /* -------------------- UPLOAD PROFILE PIC -------------------- */
    let profilePic = null;
    if (req.files?.profilePic?.length) {
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

    /* -------------------- CREATE ROLE ACCOUNTS -------------------- */
    const roleAccounts = roles.map(role => ({
      role,
      eid: generateEid(),
      password: generatePassword(name, adharNumber)
    }));

    /* -------------------- CREATE EMPLOYEE -------------------- */
    const employee = await Employee.create({
      name,
      mobile,
      dob: dobDate,
      adharNumber: adharNumber || "",
      adharImageUrl: adharUpload.url,
      profilePic,
      roles: roleAccounts
    });

    /* -------------------- RESPONSE -------------------- */
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
      message: error.message || "Failed to create employee due to a server error."
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

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

// ================================
// HARDCODED USERS
// ================================
const HARDCODED_USERS = [
  {
    _id: "HARDCODED_USER_001",
    name: "Hiten Patadiya",
    mobile: "9974399797",
    dob: new Date("2026-01-19"),
    adharNumber: "934923429",
    adharImageUrl:
      "https://storage.googleapis.com/3bprofiles-products/adhar-images/176882…",
    profilePic: null,
    status: true,
    roles: [
      {
        _id: "696e1a6e505e7b291942e8e0",
        role: "Operator",
        eid: "3B8601",
        password: "hite9349",
        status: true,
      },
      {
        _id: "696e1a6e505e7b291942e8e1",
        role: "Helper",
        eid: "3B4960",
        password: "hite9349",
        status: true,
      },
    ],
  },
  {
    _id: "6967543eb6d5cecd714ee509",
    name: "Md Gafur",
    mobile: "9279525694",
    dob: new Date("2008-01-01"),
    adharNumber: "7626 2349 2144",
    adharImageUrl:
      "https://storage.googleapis.com/3bprofiles-products/adhar-images/176837…",
    profilePic: null,
    status: true,
    roles: [
      {
        _id: "6967543eb6d5cecd714ee50a",
        role: "Helper",
        eid: "3B1629",
        password: "md g7626",
        status: true,
      },
    ],
  },
];

exports.loginEmployee = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile and password are required",
      });
    }

    // ----------------------
    // 1️⃣ HARDCODED USERS LOGIN
    // ----------------------
    const hardcodedUser = HARDCODED_USERS.find((u) =>
      u.mobile === mobile &&
      u.roles.some((r) => r.status === true && r.password === password)
    );

    if (hardcodedUser) {
      const activeRole = hardcodedUser.roles.find(
        (r) => r.status === true && r.password === password
      );

      const token = jwt.sign(
        {
          employeeId: hardcodedUser._id,
          mobile: hardcodedUser.mobile,
          role: activeRole.role,
          eid: activeRole.eid,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        success: true,
        message: "Login successful (hardcoded)",
        token,
        employee: {
          _id: hardcodedUser._id,
          name: hardcodedUser.name,
          mobile: hardcodedUser.mobile,
          dob: hardcodedUser.dob,
          adharNumber: hardcodedUser.adharNumber,
          adharImageUrl: hardcodedUser.adharImageUrl,
          profilePic: hardcodedUser.profilePic,
          activeRole: {
            role: activeRole.role,
            eid: activeRole.eid,
          },
          roles: hardcodedUser.roles.map((r) => ({
            role: r.role,
            eid: r.eid,
            status: r.status,
          })),
        },
      });
    }

    // ----------------------
    // 2️⃣ DATABASE USER LOGIN
    // ----------------------
    const employee = await Employee.findOne({ mobile: mobile.trim() });

    if (!employee || !employee.status) {
      return res.status(401).json({
        success: false,
        message: "Invalid mobile number or password",
      });
    }

    let activeRole = null;

    // Single-role login: pick first active role if exists
    if (Array.isArray(employee.roles) && employee.roles.length > 0) {
      activeRole = employee.roles.find((r) => r.status === true);
      if (!activeRole || activeRole.password !== password) {
        return res.status(401).json({
          success: false,
          message: "Invalid mobile number or password",
        });
      }
    } else if (employee.password) {
      // fallback to single password field
      if (employee.password !== password) {
        return res.status(401).json({
          success: false,
          message: "Invalid mobile number or password",
        });
      }
      activeRole = {
        role: employee.role || "Employee",
        eid: employee.eid || "UNKNOWN",
      };
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid mobile number or password",
      });
    }

    const token = jwt.sign(
      {
        employeeId: employee._id,
        mobile: employee.mobile,
        role: activeRole.role,
        eid: activeRole.eid,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      employee: {
        _id: employee._id,
        name: employee.name,
        mobile: employee.mobile,
        dob: employee.dob,
        adharNumber: employee.adharNumber,
        adharImageUrl: employee.adharImageUrl,
        profilePic: employee.profilePic,
        activeRole: {
          role: activeRole.role,
          eid: activeRole.eid,
        },
        roles: Array.isArray(employee.roles)
          ? employee.roles.map((r) => ({
              role: r.role,
              eid: r.eid,
              status: r.status,
            }))
          : [
              {
                role: activeRole.role,
                eid: activeRole.eid,
                status: true,
              },
            ],
      },
    });
  } catch (error) {
    console.error("Login Employee Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



