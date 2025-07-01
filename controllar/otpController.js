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

    if (verifyRes.data.Status !== 'Success' || verifyRes.data.Details !== 'OTP Matched') {
      return res.status(400).json({
        status: false,
        message: 'Invalid OTP',
        details: verifyRes.data
      });
    }

    // OTP is matched, now try to send the email
    try {
      await sendWelcomeEmail(email);
      return res.status(200).json({
        status: true,
        message: 'OTP verified and welcome email sent'
      });
    } catch (emailError) {
      console.error('EMAIL SENDING ERROR:', emailError.message);
      // This error is critical but we might still want to let the user in.
      // Or, we can report the failure clearly.
      return res.status(500).json({
        status: false,
        message: 'OTP verification was successful, but failed to send the welcome email.',
        error: emailError.message // Provide a clearer error
      });
    }

  } catch (error) {
    // This will now mostly catch errors from the 2factor.in API call
    console.error('OTP VERIFY API ERROR:', error.message);
    return res.status(500).json({
      status: false,
      message: 'Error during OTP verification process',
      error: error.response?.data || error.message
    });
  }
};


