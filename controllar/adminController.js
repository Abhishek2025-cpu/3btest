const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const { uploadBufferToGCS } = require('../utils/gcloud'); // Make sure this utility is correct
const { sendOtpEmail } = require('../utils/sendOtp'); // Make sure this utility is correct

// Admin Login (Corrected and Secure)

// Admin Registration (No bcrypt hashing — for testing only)
exports.register = async (req, res) => {
  try {
    const { email, number, password } = req.body;

    if (!password || (!email && !number)) {
      return res.status(400).json({ message: 'Password and either email or number are required' });
    }

    // Check for existing admin with same email or number
    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { number }],
    });

    if (existingAdmin) {
      return res.status(409).json({ message: 'Admin with given email or number already exists' });
    }

    // Create new admin (storing plain password — NOT recommended in production)
    const newAdmin = new Admin({
      email,
      number,
      password, // No hashing here
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



exports.login = async (req, res) => {
  try {
    const { number, password } = req.body;

    if (!number || !password) {
      return res.status(400).json({ message: 'Number and password are required' });
    }

    // 1. Find admin by their unique number first
    const admin = await Admin.findOne({ number }).select('+password'); // Include password for comparison
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 2. Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Login successful, prepare safe data to send back
    const adminObject = admin.toObject();
    delete adminObject.password; // Remove password hash
    delete adminObject.otp;      // Remove sensitive otp info
    delete adminObject.otpExpiry;

    res.status(200).json({ message: 'Login successful', admin: adminObject });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Request OTP for number/password update
exports.requestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: 'Admin with that email not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.otp = otp;
    admin.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes from now

    await admin.save();
    
    // Make sure sendOtpEmail is an async function that handles its own errors
    await sendOtpEmail(admin.email, otp);

    res.json({ message: `OTP sent to ${admin.email}.` });
  } catch (err) {
    console.error("Request OTP Error:", err);
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
};

// Verify OTP and update number/password
exports.verifyAndUpdate = async (req, res) => {
  try {
    const { email, otp, number, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (admin.otp !== otp || !admin.otpExpiry || Date.now() > admin.otpExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (number) admin.number = number;
    // Hash the new password before saving
    if (password) admin.password = await bcrypt.hash(password, 10);

    admin.otp = undefined; // Use undefined to remove from DB
    admin.otpExpiry = undefined;
    await admin.save();

    const adminObject = admin.toObject();
    delete adminObject.password;

    res.json({ message: 'Admin credentials updated successfully', admin: adminObject });
  } catch (err) {
    console.error("Verify and Update Error:", err);
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

// Update profile photo (no OTP required)
exports.updateProfilePhoto = async (req, res) => {
  try {
    // Get the ID from the URL parameters
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // This presumes uploadBufferToGCS is an async function that returns the public URL
    const photoUrl = await uploadBufferToGCS(req.file.buffer, req.file.originalname, 'admin-photos');
    admin.profilePhoto = photoUrl;

    await admin.save();

    res.json({ message: 'Profile photo updated', profilePhoto: photoUrl });
  } catch (err) {
    console.error("Update Photo Error:", err);
    res.status(500).json({ message: 'Failed to update photo', error: err.message });
  }
};