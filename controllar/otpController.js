// controllers/otpController.js
const axios = require('axios');
const User = require('../models/User');

const API_KEY = 'ed737417-3faa-11f0-a562-0200cd936042';
const SENDER_ID = 'THRBEE'; // From DLT
const TEMPLATE_ID = '1107175093827517588'; // CT Id from DLT portal
const PE_ID = '1101644800000087291'; // PE Id from DLT portal

exports.sendOtp = async (req, res) => {
  const { number, email } = req.body;

  try {
    // Check if mobile number already exists
    const existingNumber = await User.findOne({ number });
    if (existingNumber) {
      return res.status(400).json({
        status: false,
        message: 'Mobile number already registered'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        status: false,
        message: 'Email already registered'
      });
    }

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Construct SMS content using your DLT-approved template
    const message = `Your OTP for login to 3B Profiles is ${otp}. It is valid for 2 minutes. Do not share this OTP with anyone for security reasons.`;

    // Send SMS via 2Factor API using template
    const smsRes = await axios.get(
      `https://2factor.in/API/V1/${API_KEY}/SMS/${number}/${encodeURIComponent(message)}/${SENDER_ID}/${TEMPLATE_ID}`
    );

    if (smsRes.data.Status === 'Success') {
      return res.status(200).json({
        status: true,
        message: 'OTP sent via SMS',
        sessionId: smsRes.data.Details,
        otp // Optional: Only show in dev/testing, not production
      });
    } else {
      return res.status(400).json({
        status: false,
        message: 'Failed to send OTP',
        details: smsRes.data
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'Internal server error while sending OTP',
      error: error.message
    });
  }
};


// Step 2: Verify OTP
exports.verifyOtp = async (req, res) => {
  const { sessionId, otp, email } = req.body;

  if (!sessionId || !otp || !email) {
    return res.status(400).json({
      status: false,
      message: 'sessionId, otp, and email are required'
    });
  }

  try {
    const verifyRes = await axios.get(
      `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY/${sessionId}/${otp}`
    );

    if (verifyRes.data.Status === 'Success' && verifyRes.data.Details === 'OTP Matched') {
      // ✅ OTP matched – send welcome email
      await sendWelcomeEmail(email);

      return res.status(200).json({
        status: true,
        message: 'OTP verified and Welcome email sent'
      });
    } else {
      return res.status(400).json({
        status: false,
        message: 'Invalid OTP',
        details: verifyRes.data
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'OTP verification or email error',
      error: error.message
    });
  }
};

