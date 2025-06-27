const axios = require('axios');
const User = require('../models/User');

const API_KEY = 'ed737417-3faa-11f0-a562-0200cd936042';
const TEMPLATE_ID = '1107175093827517588'; // DLT-approved template

exports.sendOtp = async (req, res) => {
  const { number } = req.body;

  if (!number) {
    return res.status(400).json({ status: false, message: 'Mobile number is required' });
  }

  try {
    const existingUser = await User.findOne({ number });
    if (existingUser) {
      return res.status(400).json({ status: false, message: 'Mobile number already registered' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

    // ✅ Correct URL for DLT-approved template
    const otpRes = await axios.get(
      `https://2factor.in/API/V1/${API_KEY}/SMS/${number}/${otp}/${TEMPLATE_ID}`
    );

    if (otpRes.data.Status === 'Success') {
      return res.status(200).json({
        status: true,
        message: 'OTP sent successfully',
        sessionId: otpRes.data.Details,
        otp // remove in production
      });
    } else {
      return res.status(400).json({
        status: false,
        message: 'Failed to send OTP',
        details: otpRes.data
      });
    }
  } catch (error) {
    console.error('Error sending OTP:', {
      url: error?.config?.url,
      status: error?.response?.status,
      data: error?.response?.data
    });

    return res.status(500).json({
      status: false,
      message: 'Error sending OTP',
      error: error.response?.data || error.message
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
      await sendWelcomeEmail(email); // ✅ send email if OTP matched

      return res.status(200).json({
        status: true,
        message: 'OTP verified and welcome email sent'
      });
    } else {
      return res.status(400).json({
        status: false,
        message: 'Invalid OTP',
        details: verifyRes.data
      });
    }
  } catch (error) {
    console.error('OTP VERIFY ERROR:', error.message);
    return res.status(500).json({
      status: false,
      message: 'OTP verification or email error',
      error: error.response?.data || error.message
    });
  }
};
