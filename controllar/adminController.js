const Admin = require('../models/Admin');
const SubAdmin = require('../models/SubAdmin');
const { uploadBufferToGCS } = require('../utils/gcloud');

// ✅ Admin Registration (No hashing)
exports.register = async (req, res) => {
  try {
    const { email, number, password } = req.body;

    if (!password || (!email && !number)) {
      return res.status(400).json({ message: 'Password and either email or number are required' });
    }

    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { number }],
    });

    if (existingAdmin) {
      return res.status(409).json({ message: 'Admin with given email or number already exists' });
    }

    const newAdmin = new Admin({
      email,
      number,
      password, // plain-text
    });

    await newAdmin.save();

    const adminObject = newAdmin.toObject();
    delete adminObject.password;

    res.status(201).json({ message: 'Admin registered successfully', admin: adminObject });
  } catch (err) {
    console.error("Admin Registration Error:", err);
    res.status(500).json({ message: 'Failed to register admin', error: err.message });
  }
};

// ✅ Admin Login (Plain password check)
exports.login = async (req, res) => {
  try {
    const { number, password } = req.body;

    if (!number || !password) {
      return res.status(400).json({ message: 'Number and password are required' });
    }

    // 1. Try to find in Admin first
    let user = await Admin.findOne({ number }).select('+password');
    let role = 'admin';

    // 2. If not found in Admin, try SubAdmin (by phone instead of number)
    if (!user) {
      user = await SubAdmin.findOne({ phone: number }).select('+password');
      role = 'sub-admin';
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password (bcrypt for SubAdmin, plain for Admin unless you hash admin too)
    let isMatch = false;
    if (role === 'admin') {
      // If you hashed Admin passwords, replace this with bcrypt.compare
      isMatch = user.password === password;
    } else {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Clean user object
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.otp;
    delete userObject.otpExpiry;

    res.status(200).json({
      message: 'Login successful',
      role,
      user: userObject,
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ✅ Update Profile Photo
// exports.updateProfilePhoto = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!req.file) {
//       return res.status(400).json({ message: 'No image file provided' });
//     }

//     const admin = await Admin.findById(id);
//     if (!admin) {
//       return res.status(404).json({ message: 'Admin not found' });
//     }

//     const photoUrl = await uploadBufferToGCS(req.file.buffer, req.file.originalname, 'admin-photos');
//     admin.profilePhoto = photoUrl;

//     await admin.save();

//     res.json({ message: 'Profile photo updated', profilePhoto: photoUrl });
//   } catch (err) {
//     console.error("Update Photo Error:", err);
//     res.status(500).json({ message: 'Failed to update photo', error: err.message });
//   }
// };
