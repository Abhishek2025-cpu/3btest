const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const { uploadBufferToGCS } = require('../utils/gcsUploader');
const { sendOtpEmail } = require('../utils/sendOtp');

// Admin Login
exports.login = async (req, res) => {
  try {
    const { number, password } = req.body;

    const admin = await Admin.findOne({ number });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

    res.json({ message: 'Login successful', admin });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Request OTP for number/password update
exports.requestOtp = async (req, res) => {
  try {
    const { adminId } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.otp = otp;
    admin.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes from now

    await admin.save();
    await sendOtpEmail(admin.email, otp);

    res.json({ message: 'OTP sent to registered email.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
};

// Verify OTP and update number/password
exports.verifyAndUpdate = async (req, res) => {
  try {
    const { adminId, otp, number, password } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (admin.otp !== otp || Date.now() > admin.otpExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (number) admin.number = number;
    if (password) admin.password = await bcrypt.hash(password, 10);

    admin.otp = null;
    admin.otpExpiry = null;
    await admin.save();

    res.json({ message: 'Admin credentials updated successfully', admin });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

// Update profile photo (no OTP required)
exports.updateProfilePhoto = async (req, res) => {
  try {
    const { adminId } = req.body;

    if (!req.file) return res.status(400).json({ message: 'No image file provided' });

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const photoUrl = await uploadBufferToGCS(req.file.buffer, req.file.originalname, 'admin-photos');
    admin.profilePhoto = photoUrl;

    await admin.save();

    res.json({ message: 'Profile photo updated', profilePhoto: photoUrl });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update photo', error: err.message });
  }
};
