// Import necessary modules
const axios = require('axios');
const GstDetails = require('../models/GstDetails');
const User = require('../models/User');

// --- UPDATED CONSTANTS FOR THE NEW API ---
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '067908d46amsh868a7a0568364bfp17c722jsnc35d92475944';
const RAPIDAPI_HOST = 'gst-verification-api-get-profile-returns-data.p.rapidapi.com';

/**
 * Gets GST profile and return data from the new API, saves the profile, and updates the user.
 */
exports.verifyAndSaveGSTIN = async (req, res) => {
  // --- ADDED a new required parameter: returnPeriod ---
  let { userId, gstin, returnPeriod } = req.query;

  // 1. Validate that all required inputs were provided
  if (!userId || !gstin || !returnPeriod) {
    return res.status(400).json({
      success: false,
      message: 'userId, gstin, and returnPeriod are required query parameters.'
    });
  }

  // 2. Sanitize inputs
  gstin = gstin.trim();
  returnPeriod = returnPeriod.trim();

  try {
    // 3. Make the call to the NEW GST verification API
    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/v1/gstin/${gstin}/return/${returnPeriod}`,
      {
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST,
        }
      }
    );

    const apiResponseData = response.data;

    // --- CRUCIAL STEP: LOG THE RESPONSE TO SEE THE STRUCTURE ---
    // You MUST look at this log in your terminal to confirm the field names below are correct.
    console.log(`--- NEW API RAW RESPONSE ---:`, JSON.stringify(apiResponseData, null, 2));
    // -----------------------------------------------------------

    // 4. Check if the API call was successful
    if (!apiResponseData || apiResponseData.success === false) {
      return res.status(400).json({
        success: false,
        message: 'API returned an error. Please check the GSTIN and return period.',
        error: apiResponseData.message || 'No data found'
      });
    }
    
    // 5. Extract the profile data (THIS IS AN EDUCATED GUESS - VERIFY WITH THE LOG)
    const profile = apiResponseData.data?.profile;
    if (!profile) {
        return res.status(500).json({ success: false, message: 'Could not find profile information in the API response.' });
    }

    // 6. Save the profile data to your database
    const savedDetails = await GstDetails.findOneAndUpdate(
      { userId },
      {
        userId,
        gstin: profile.gstin || gstin,
        legalName: profile.lgnm,
        tradeName: profile.tradeNam,
        state: profile.pradr?.addr?.st // Note: State might be nested differently
      },
      {
        new: true,
        upsert: true
      }
    );

    // 7. Update the User model
    await User.findByIdAndUpdate(userId, { gstin: profile.gstin });

    // 8. Send a successful response with ALL the data from the API
    return res.status(200).json({ success: true, data: apiResponseData.data });

  } catch (err) {
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

