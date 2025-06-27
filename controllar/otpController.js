const axios = require('axios');
const User = require('../models/User');

const API_KEY = 'ed737417-3faa-11f0-a562-0200cd936042';
const SENDER_ID = 'THRBEE'; // DLT Sender ID
const TEMPLATE_ID = '1107175093827517588'; // DLT CT ID

exports.sendOtp = async (req, res) => {
  const { number, email } = req.body;

  try {
    const existingNumber = await User.findOne({ number });
    if (existingNumber) {
      return res.status(400).json({
        status: false,
        message: 'Mobile number already registered'
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        status: false,
        message: 'Email already registered'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    const smsRes = await axios.get(
      `https://2factor.in/API/V1/${API_KEY}/SMS/${number}/${otp}/${SENDER_ID}/${TEMPLATE_ID}`
    );

    if (smsRes.data.Status === 'Success') {
      return res.status(200).json({
        status: true,
        message: 'OTP sent via SMS',
        sessionId: smsRes.data.Details
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

