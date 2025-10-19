const User = require('../models/User');
const Archive = require('../models/Archive');
const { translateResponse } = require('../services/translation.service');
const { sendNotification } = require('../services/notificationService');
const userProfileFieldsToTranslate = [
  'name'
];

// POST /signup
// controllers/userController.js


const axios = require('axios');


const API_KEY = 'ed737417-3faa-11f0-a562-0200cd936042';

// STEP 1: Send OTP at login
exports.loginSendOtp = async (req, res) => {
  const { email, number } = req.body;

  if (!email && !number) {
    return res.status(400).json({ status: false, message: 'Please provide email or number' });
  }

  try {
    const user = await User.findOne(email ? { email } : { number });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found with provided email/number' });
    }

    if (!user.number) {
      return res.status(400).json({ status: false, message: 'User does not have a phone number registered' });
    }

    // ✅ Test bypass condition
    if (user.number === '9999999999') {
      return res.status(200).json({
        status: true,
        message: 'Test OTP sent successfully (bypassed 2Factor)',
        sessionId: null, // No session ID for testing
        userId: user._id,
        testOtp: '123456'
      });
    }

    // Normal flow using 2Factor API
    const otpRes = await axios.get(
      `https://2factor.in/API/V1/${API_KEY}/SMS/+91${user.number}/AUTOGEN`
    );

    if (otpRes.data.Status === 'Success') {
      return res.status(200).json({
        status: true,
        message: 'OTP sent via SMS for login',
        sessionId: otpRes.data.Details,
        userId: user._id
      });
    } else {
      return res.status(400).json({ status: false, message: 'Failed to send OTP', details: otpRes.data });
    }
  } catch (error) {
    console.error('Login OTP Error:', error.response?.data || error.message);
    return res.status(500).json({
      status: false,
      message: 'Error sending login OTP',
      error: error.response?.data || error.message
    });
  }
};



// STEP 2: Verify OTP at login
exports.loginVerifyOtp = async (req, res) => {
  const { sessionId, otp, userId } = req.body;

  if (!otp || !userId) {
    return res.status(400).json({
      status: false,
      message: 'otp and userId are required'
    });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    // Test bypass: only for test phone and test OTP.
    // Optional: restrict bypass to development environment.
    const isDev = process.env.NODE_ENV === 'development';
    if (user.number === '9999999999' && otp === '123456' && (isDev || true)) {
      // NOTE: change `(isDev || true)` to just `isDev` if you want the bypass only in dev
      return res.status(200).json({
        status: true,
        message: 'Test login successful (bypassed OTP verification)',
        user
      });
    }

    // For non-test flows, sessionId is required
    if (!sessionId) {
      return res.status(400).json({
        status: false,
        message: 'sessionId is required for non-test users'
      });
    }

    // Verify with 2Factor
    const verifyRes = await axios.get(
      `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY/${sessionId}/${otp}`
    );

    if (verifyRes.data.Status !== 'Success' || verifyRes.data.Details !== 'OTP Matched') {
      return res.status(400).json({
        status: false,
        message: 'Invalid OTP',
        details: verifyRes.data
      });
    }

    // OTP matched
    return res.status(200).json({
      status: true,
      message: 'Login successful',
      user
    });

  } catch (error) {
    console.error('Login OTP VERIFY ERROR:', error.response?.data || error.message);
    return res.status(500).json({
      status: false,
      message: 'Error during login OTP verification',
      error: error.response?.data || error.message
    });
  }
};



exports.signup = async (req, res) => {
  const { name, number, email, fcmToken, otp } = req.body;

  if (!name || !number || !email) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // ✅ Allow test signup bypass for testing number
    if (number === '9999999999' && otp === '123456') {
      const testUser = {
        _id: 'test-user-id',
        name,
        number,
        email,
        role: 'client',
        profileImage: null,
        fcmTokens: fcmToken ? [fcmToken] : [],
      };

      if (fcmToken) {
        await sendNotification(
          testUser._id,
          [fcmToken],
          "Welcome 🎉 (Test Mode)",
          `Dear ${name}, this is a test signup using number 9999999999.`
        );
      }

      return res.status(201).json({
        message: '✅ Test user registered successfully',
        user: testUser,
      });
    }

    // 🔹 Proceed with normal signup flow
    const existingEmail = await User.findOne({ email });
    const existingNumber = await User.findOne({ number });

    if (existingEmail || existingNumber) {
      return res.status(400).json({ message: 'User already exists with this email or number' });
    }

    let profileImage = null;
    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      profileImage = `data:${mimeType};base64,${base64}`;
    }

    const newUser = new User({
      name,
      number,
      email,
      role: 'client',
      profileImage,
      fcmTokens: fcmToken ? [fcmToken] : [],
    });

    await newUser.save();

    // ✅ Trigger welcome notification
    if (fcmToken) {
      await sendNotification(
        newUser._id,
        [fcmToken],
        "Welcome 🎉",
        `Dear ${name}, your account has been set up. Happy shopping!`
      );
    }

    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    console.error("❌ Signup Error:", error);
    res.status(500).json({ message: 'Signup failed', error: error.message });
  }
};





exports.updateUser = async (req, res) => {
  const { userId } = req.params;
  const { name, number, email } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Apply updates if present
    if (name) user.name = name;
    if (number) user.number = number;
    if (email) user.email = email;


    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      user.profileImage = `data:${mimeType};base64,${base64}`;
    }

    await user.save();

    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
};




// POST /login
exports.login = async (req, res) => {
  const { email, number } = req.body;

  if (!email && !number) {
    return res.status(400).json({ message: 'Please provide either email or phone number to login' });
  }

  try {
    const user = await User.findOne(email ? { email } : { number });

    if (!user) {
      return res.status(404).json({ message: 'User not found with provided email or number' });
    }

    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};


exports.getUserProfiles = async (req, res) => {
  try {
    const users = await User.find().select('-__v -createdAt -updatedAt'); // optional: exclude metadata fields
    res.status(200).json({ message: 'User profiles fetched successfully', users });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user profiles', error: error.message });
  }
};

exports.getUserProfileById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Step 1: Fetch the single user from the DB. Use .lean() for performance.
    const userFromDB = await User.findById(userId)
      .select('-__v -createdAt -updatedAt')
      .lean(); // Add .lean() to get a plain JavaScript object

    // Handle case where user does not exist
    if (!userFromDB) {
      return res.status(404).json({
        success: false,
        message: '❌ User not found'
      });
    }

    // Step 2: Translate the user object.
    // Since translateResponse expects an array, we wrap our single user in an array,
    // then get the first (and only) result back.
    const translatedUserArray = await translateResponse(req, [userFromDB], userProfileFieldsToTranslate);
    const translatedUser = translatedUserArray[0];

    // Step 3: Send the consistent, successful response
    res.status(200).json({
      success: true,
      message: '✅ User profile fetched successfully',
      user: translatedUser // Use the translated user object
    });

  } catch (error) {
    // Step 4: Use consistent error handling
    console.error('❌ Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to fetch user profile',
      error: error.message
    });
  }
};



exports.deleteUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Save deleted user data in Archive
    const archivedUser = await Archive.create({
      originalUserId: user._id,
      deletedUserData: user.toObject(),
    });

    // Delete user from main collection
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: 'User deleted successfully and archived',
      archivedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete user',
      error: error.message,
    });
  }
};

// Get all archived users
exports.getArchivedUsers = async (req, res) => {
  try {
    const archivedUsers = await Archive.find().sort({ deletedAt: -1 });

    if (!archivedUsers.length) {
      return res.status(404).json({ message: 'No archived users found' });
    }

    res.status(200).json({
      message: 'Archived users fetched successfully',
      archivedUsers,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch archived users',
      error: error.message,
    });
  }
};
