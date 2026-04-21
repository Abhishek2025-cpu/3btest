const Admin = require('../models/Admin');
const SubAdmin = require('../models/SubAdmin');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
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


const axios = require('axios');


const API_KEY = 'ed737417-3faa-11f0-a562-0200cd936042'; // your 2Factor API

const MASTER_ADMIN_NUMBER = '9341347322';



exports.login = async (req, res) => {
  try {
    const { number } = req.body;

    if (!number) {
      return res.status(400).json({ message: 'Number is required' });
    }

    // ✅ TEST BYPASS FIRST
    if (number === '9999999999') {
      let user = await Admin.findOne({ number });

      // optional: create test user if not exists
      if (!user) {
        user = await Admin.create({
  number: '9999999999',
  name: 'Test User',
  email: 'test9999999999@gmail.com' // ✅ add this
});
      }

      return res.status(200).json({
        message: 'Test OTP sent',
        sessionId: 'test-session',
        userId: user._id,
        role: 'admin'
      });
    }

    // 🔽 ORIGINAL LOGIC (UNCHANGED)
    let user = await Admin.findOne({ number });
    let role = 'admin';

    if (!user) {
      user = await SubAdmin.findOne({ phone: number });
      role = 'subadmin';
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // REAL OTP
    const otpRes = await axios.get(
      `https://2factor.in/API/V1/${API_KEY}/SMS/+91${number}/AUTOGEN`
    );

    if (otpRes.data.Status !== 'Success') {
      return res.status(400).json({
        message: 'Failed to send OTP',
        details: otpRes.data
      });
    }

    user.otp = otpRes.data.Details;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    return res.status(200).json({
      message: 'OTP sent successfully',
      sessionId: otpRes.data.Details,
      userId: user._id,
      role
    });

  } catch (err) {
    console.error('Login Error:', err.response?.data || err.message);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.verifyOtp = async (req, res) => {
  try {
    const { userId, otp, sessionId } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        message: 'userId and otp are required'
      });
    }

    let user = await Admin.findById(userId);
    let role = 'admin';

    if (!user) {
      user = await SubAdmin.findById(userId);
      role = 'subadmin';
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ✅ TEST BYPASS LOGIN
    if (user.number === '9999999999' && otp === '123456') {
      const token = crypto.randomBytes(32).toString('hex');

      user.token = token;
      user.lastLoginAt = new Date();
      await user.save();

      return res.status(200).json({
        message: 'Test login successful',
        token,
        role,
        user
      });
    }

    // ✅ MASTER ADMIN BYPASS
    if (user.number === '9341347322' && otp === '123456') {
      const token = crypto.randomBytes(32).toString('hex');

      user.token = token;
      user.lastLoginAt = new Date();
      await user.save();

      return res.status(200).json({
        message: 'Master admin login successful',
        token,
        role,
        user
      });
    }

    // ✅ OTP EXPIRY CHECK
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // ✅ VERIFY OTP FROM 2FACTOR
    const verifyRes = await axios.get(
      `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY/${sessionId}/${otp}`
    );

    if (
      verifyRes.data.Status !== 'Success' ||
      verifyRes.data.Details !== 'OTP Matched'
    ) {
      return res.status(400).json({
        message: 'Invalid OTP',
        details: verifyRes.data
      });
    }

    const token = crypto.randomBytes(32).toString('hex');

    user.token = token;
    user.lastLoginAt = new Date();
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(200).json({
      message: 'Login successful',
      token,
      role,
      user: userObj
    });

  } catch (err) {
    console.error('OTP Verify Error:', err);
    res.status(500).json({ message: 'Server error' });
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
