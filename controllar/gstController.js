// Import necessary modules
const axios = require('axios');
const GstDetails = require('../models/GstDetails');
const User = require('../models/User');

// --- THIS IS THE ONLY LINE THAT HAS CHANGED ---
// It now uses your new, working API key from your new account.
const RAPIDAPI_KEY = '067908d46amsh868a7a0568364bfp17c722jsnc35d92475944';
// ---------------------------------------------

const RAPIDAPI_HOST = 'gst-return-status.p.rapidapi.com';

/**
 * Verifies a GSTIN using an external API, saves the details, and updates the user model.
 */
exports.verifyAndSaveGSTIN = async (req, res) => {
  // Use 'let' to allow modification/cleaning of the input
  let { userId, gstin } = req.query;

  // 1. Validate that the required inputs were provided
  if (!userId || !gstin) {
    return res.status(400).json({ 
      success: false, 
      message: 'userId and gstin are required query parameters.' 
    });
  }

  // 2. Sanitize the input to prevent errors from accidental whitespace
  gstin = gstin.trim();

  try {
    // 3. Make the call to the external GST verification API
    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/free/gstin/${gstin}`,
      {
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST,
        }
      }
    );

    // 4. Get the data from the API response
    const data = response.data;

    // Optional: You can keep this log for verification or remove it
    console.log(`--- RAW RESPONSE FOR GSTIN ${gstin} ---:`, JSON.stringify(data, null, 2));

    // 5. Check if the response indicates a valid, active GSTIN
    if (!data || data.sts !== 'Active') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or unregistered GSTIN. Please check the GSTIN and try again.' 
      });
    }

    // 6. If valid, save/update the details in your database
    const savedDetails = await GstDetails.findOneAndUpdate(
      { userId },
      {
        userId,
        gstin: data.gstin,
        legalName: data.lgnm,
        tradeName: data.tradeNam,
        state: data.pradr?.st || null
      },
      { 
        new: true,
        upsert: true
      }
    );

    // 7. Update the User model
    await User.findByIdAndUpdate(
      userId,
      { gstin: data.gstin },
      { new: true }
    );

    // 8. Send a successful response back to the client
    return res.status(200).json({ success: true, data: savedDetails });

  } catch (err) {
    // This block will now only run for real errors, not subscription issues
    if (err.response) {
      console.error('--- EXTERNAL API ERROR RESPONSE ---:', JSON.stringify(err.response.data, null, 2));
      return res.status(err.response.status || 500).json({
        success: false,
        message: `External API Error: ${err.response.data.message || 'Verification failed.'}`,
        error: err.response.data
      });
    } else {
      console.error('--- INTERNAL/NETWORK ERROR ---:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error during verification.', 
        error: err.message 
      });
    }
  }
};