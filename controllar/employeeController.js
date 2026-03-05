const { uploadBufferToGCS } = require('../utils/gcloud');
const Employee = require('../models/Employee');
const axios = require('axios');
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");



function generatePassword(name, adhar) {
  // keep only alphabets from name
  const cleanName = (name || "")
    .toLowerCase()
    .replace(/[^a-z]/g, ""); // removes space, dot, special chars

  // take first 4 valid letters
  const namePart = cleanName.slice(0, 4);

  // keep only digits from adhar
  const cleanAdhar = (adhar || "").replace(/\D/g, "");

  // take first 4 digits
  const adharPart = cleanAdhar.slice(0, 4);

  // combine and ensure 8 characters
  return (namePart + adharPart).padEnd(8, "0");
}


async function generateEID() {
  const count = await Employee.countDocuments();
  const nextNumber = count + 1;

  return `EMP${String(nextNumber).padStart(3, "0")}`;
}


// exports.createEmployee = async (req, res) => {
//   try {
//     let { name, mobile, dob, adharNumber, role, otherRoles } = req.body;

//     /* -------------------- VALIDATION -------------------- */
 

//     /* -------------------- DUPLICATE CHECK -------------------- */
//   if (role) {
//       // Agar frontend se string aa rahi hai "Helper, Other", toh usey array banao
//       if (typeof role === 'string') {
//         role = role.split(',').map(r => r.trim());
//       }
//     } else {
//       return res.status(400).json({ message: "Role is required" });
//     }

//     const existingEmployee = await Employee.findOne({ mobile });
//     if (existingEmployee) {
//       return res.status(400).json({
//         message: "Mobile number already exists.",
//       });
//     }

//     /* -------------------- DOB -------------------- */
//     let dobDate = null;
//     if (dob) {
//       dobDate = new Date(dob);
//       if (isNaN(dobDate.getTime())) {
//         return res.status(400).json({
//           message: "Invalid DOB format.",
//         });
//       }
//     }

//     /* -------------------- FILE UPLOAD -------------------- */
//     if (!req.files?.adharImage?.length) {
//       return res.status(400).json({
//         message: "Adhar image is required.",
//       });
//     }

//     const adharFile = req.files.adharImage[0];
//     const adharUpload = await uploadBufferToGCS(
//       adharFile.buffer,
//       adharFile.originalname,
//       "adhar-images",
//       adharFile.mimetype
//     );

//     /* -------------------- PROFILE PIC -------------------- */
//     let profilePic = null;
//     if (req.files?.profilePic?.length) {
//       const profileFile = req.files.profilePic[0];
//       const profileUpload = await uploadBufferToGCS(
//         profileFile.buffer,
//         profileFile.originalname,
//         "employee/profile-pics",
//         profileFile.mimetype
//       );

//       profilePic = {
//         url: profileUpload.url,
//         fileId: profileUpload.id,
//       };
//     }
//     const eid = await generateEID();

//     /* -------------------- PASSWORD GENERATION -------------------- */
//     const password = generatePassword(name, adharNumber);

//       if (!role.includes('Other')) {
//       otherRoles = []; 
//     } else {
//       if (typeof otherRoles === 'string') {
//         otherRoles = otherRoles.split(',').map(r => r.trim()).filter(Boolean);
//       }
//     }
   
//     /* -------------------- CREATE EMPLOYEE -------------------- */
//     const employee = await Employee.create({
//       name,
//       mobile,
//       dob: dobDate,
//       adharNumber: adharNumber || "",
//       adharImageUrl: adharUpload.url,
//       profilePic,
//       role,
//       password,
//       eid, 
//       otherRoles // will be hashed automatically
//     });

//     /* -------------------- RESPONSE -------------------- */
//     res.status(201).json({
//       message: "Employee created successfully",
//       credentials: {
//         mobile: employee.mobile,
//         password: password, // send only once
//       },
//       employee: {
//         _id: employee._id,
//         name: employee.name,
//         mobile: employee.mobile,
//         role: employee.role,
//         status: employee.status,
//         otherRoles: otherRoles
        
//       },
//     });
//   } catch (error) {
//     console.error("Create Employee Error:", error);
//     res.status(500).json({
//       message:
//         error.message || "Failed to create employee due to a server error.",
//     });
//   }
// };

exports.createEmployee = async (req, res) => {
  try {
    let { name, mobile, dob, adharNumber, role, otherRoles } = req.body;

    /* -------------------- 1. ROLE & OTHER ROLES PARSING -------------------- */
    // Role ko array mein convert karein (Kyunki multipart/form-data se string aata hai)
    if (role) {
      if (typeof role === 'string') {
        role = role.split(',').map(r => r.trim());
      }
    } else {
      return res.status(400).json({ message: "Role is required." });
    }

    // "Other" roles ka logic
    if (role.includes('Other')) {
      if (typeof otherRoles === 'string') {
        // "electrician, plumber" -> ["electrician", "plumber"]
        otherRoles = otherRoles.split(',').map(r => r.trim()).filter(Boolean);
      } else if (!otherRoles) {
        otherRoles = [];
      }
    } else {
      // Agar role mein 'Other' nahi hai, toh any otherRoles data ko empty kar do
      otherRoles = [];
    }

    /* -------------------- 2. DUPLICATE CHECK -------------------- */
    const existingEmployee = await Employee.findOne({ mobile });
    if (existingEmployee) {
      return res.status(400).json({
        message: "Mobile number already exists.",
      });
    }

    /* -------------------- 3. DOB HANDLING -------------------- */
    let dobDate = null;
    if (dob) {
      dobDate = new Date(dob);
      if (isNaN(dobDate.getTime())) {
        return res.status(400).json({ message: "Invalid DOB format." });
      }
    }

    /* -------------------- 4. FILE UPLOAD (ADHAR) -------------------- */
    if (!req.files?.adharImage?.length) {
      return res.status(400).json({
        message: "Adhar image is required.",
      });
    }

    const adharFile = req.files.adharImage[0];
    const adharUpload = await uploadBufferToGCS(
      adharFile.buffer,
      adharFile.originalname,
      "adhar-images",
      adharFile.mimetype
    );

    /* -------------------- 5. FILE UPLOAD (PROFILE PIC) -------------------- */
    let profilePic = { url: null, fileId: null };
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
        fileId: profileUpload.id,
      };
    }

    /* -------------------- 6. GENERATE EID & PASSWORD -------------------- */
    const eid = await generateEID();
    const password = generatePassword(name, adharNumber);

    /* -------------------- 7. CREATE EMPLOYEE -------------------- */
    const employee = await Employee.create({
      name,
      mobile,
      dob: dobDate,
      adharNumber: adharNumber || "",
      adharImageUrl: adharUpload.url,
      profilePic,
      role,         // Array format: ["Other"] or ["Helper", "Other"]
      otherRoles,   // Array format: ["electrician"]
      password,     // Mongoose schema pre-save hook handles hashing
      eid, 
    });

    /* -------------------- 8. RESPONSE -------------------- */
    res.status(201).json({
      message: "Employee created successfully",
      credentials: {
        mobile: employee.mobile,
        password: password, // Send plain password only once
      },
      employee: {
        _id: employee._id,
        eid: employee.eid,
        name: employee.name,
        mobile: employee.mobile,
        role: employee.role,             // Ab yahan ["Other"] dikhega
        otherRoles: employee.otherRoles, // Ab yahan ["electrician"] dikhega
        status: employee.status,
        dob: employee.dob,
        profilePic: employee.profilePic
      },
    });

  } catch (error) {
    console.error("Create Employee Error:", error);
    res.status(500).json({
      message: error.message || "Failed to create employee due to a server error.",
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
    console.error("GET EMPLOYEES ERROR:", error);
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

exports.getEmployeesByFilter = async (req, res) => {
  try {
    // Frontend se 'role' query parameter mein aayega 
    // Example: ?selectedRole=Helper ya ?selectedRole=Electrician
    const { selectedRole } = req.query; 

    if (!selectedRole) {
      return res.status(400).json({ error: "Please provide a role to filter." });
    }

    // MongoDB Query: 
    // Hum check karenge ki selectedRole 'role' field mein hai YA 'otherRoles' array ke andar hai
    const employees = await Employee.find({
      $or: [
        { role: selectedRole },             // Case 1: Helper, Operator, Mixture
        { otherRoles: selectedRole }       // Case 2: Electrician, Admin, etc. (Array search)
      ]
    });

    if (employees.length === 0) {
      return res.status(404).json({ message: "No employees found for this role." });
    }

    res.status(200).json(employees);
  } catch (error) {
    console.error("Filter Error:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
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
    let { name, mobile, role, dob, adharNumber, password } = req.body;

    // 1. Find the employee to update
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

      if (role) {
      if (typeof role === 'string') {
        role = role.split(',').map(r => r.trim());
      }
    } else {
      role = employee.role; // Agar role nahi bheja to purana wala hi rahega
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

    // 1️⃣ Find employee
    const employee = await Employee.findOne({ mobile: mobile.trim() });

    if (!employee || !employee.status) {
      return res.status(401).json({
        success: false,
        message: "Invalid mobile or password",
      });
    }

    // 2️⃣ Check password (plain OR bcrypt based)
    let isMatch = false;

    // If you are hashing password → use this
    if (employee.password && employee.password.startsWith("$2")) {
      isMatch = await bcrypt.compare(password, employee.password);
    } else {
      // current system (plain password)
      isMatch = employee.password === password;
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid mobile or password",
      });
    }

    // 3️⃣ Generate token
    const token = jwt.sign(
      {
        employeeId: employee._id,
        mobile: employee.mobile,
        role: employee.role,
        eid: employee.eid,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 4️⃣ Response
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
        role: employee.role,
        eid: employee.eid,
        status: employee.status,
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


