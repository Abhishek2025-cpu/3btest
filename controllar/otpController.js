const axios = require('axios');
const User = require('../models/User');
const sendWelcomeEmail = require('../utils/sendWelcomeEmail'); 


const API_KEY = 'ed737417-3faa-11f0-a562-0200cd936042';

exports.sendOtp = async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ status: false, message: 'Mobile number is required' });

  try {
    const existingUser = await User.findOne({ number });
    if (existingUser) {
      return res.status(400).json({ status: false, message: 'Mobile number already registered' });
    }

    // 👉 SMS-only endpoint without template ID ensures SMS delivery
    const otpRes = await axios.get(
      `https://2factor.in/API/V1/${API_KEY}/SMS/+91${number}/AUTOGEN`
    );

    if (otpRes.data.Status === 'Success') {
      return res.status(200).json({
        status: true,
        message: 'OTP sent via SMS',
        sessionId: otpRes.data.Details
      });
    } else {
      return res.status(400).json({ status: false, message: 'Failed to send OTP via SMS', details: otpRes.data });
    }
  } catch (error) {
    console.error('OTP SMS Error:', error.response?.data || error.message);
    return res.status(500).json({
      status: false,
      message: 'Error sending OTP',
      error: error.response?.data || error.message
    });
  }
};



// Step 2: Verify OTP
exports.verifyOtp = async (req, res) => {
  const { sessionId, otp, email, number } = req.body;

  if (!sessionId || !otp || !email || !number) {
    return res.status(400).json({
      status: false,
      message: 'sessionId, otp, email, and number are required'
    });
  }

  try {
    // ✅ Test case bypass for 9999999999 and 123456
    if (number === '9999999999' && otp === '123456') {
      return res.status(200).json({
        status: true,
        message: '✅ Test OTP verified successfully (bypass mode)'
      });
    }

    // 🔹 Normal flow using 2factor.in API
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

    return res.status(200).json({
      status: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('OTP VERIFY API ERROR:', error.message);
    return res.status(500).json({
      status: false,
      message: 'Error during OTP verification process',
      error: error.response?.data || error.message
    });
  }
};


