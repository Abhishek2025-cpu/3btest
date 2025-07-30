// Import necessary modules
const axios = require('axios');
const GstDetails = require('../models/GstDetails');
const User = require('../models/User');

// --- IMPORTANT! ---
// Replace the placeholder below with YOUR actual API key from your RapidAPI account.
// It is highly recommended to store this in an environment variable (.env file).
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'PASTE_YOUR_REAL_API_KEY_HERE';
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

    // --- CRUCIAL FOR DEBUGGING --- 
    // This will print the exact response from the API to your server's console.
    // Check this log if you still have issues.
    console.log(`--- RAW RESPONSE FOR GSTIN ${gstin} ---:`, JSON.stringify(data, null, 2));
    // --------------------------------

    // 5. Check if the response indicates a valid, active GSTIN
    // The API returns a 'sts' (status) key. We must check if it is 'Active'.
    if (!data || data.sts !== 'Active') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or unregistered GSTIN, or API error. Please check the GSTIN and try again.' 
      });
    }

    // 6. If valid, prepare the data and save/update it in your database
    const savedDetails = await GstDetails.findOneAndUpdate(
      { userId }, // Find the document by userId
      {
        userId,
        gstin: data.gstin,
        legalName: data.lgnm,       // 'lgnm' is the key for Legal Name
        tradeName: data.tradeNam,     // 'tradeNam' is the key for Trade Name
        state: data.pradr?.st || null // State is nested in 'pradr.st'
      },
      { 
        new: true,    // Return the updated document
        upsert: true  // Create a new document if one doesn't exist for the user
      }
    );

    // 7. Update the User model with the verified GSTIN
    await User.findByIdAndUpdate(
      userId,
      { gstin: data.gstin },
      { new: true }
    );

    // 8. Send a successful response back to the client
    return res.status(200).json({ success: true, data: savedDetails });

  } catch (err) {
    // This 'catch' block runs if the axios request itself fails (e.g., network error, 401/403/500 from API)
    if (err.response) {
      // The request was made and the server responded with a status code that falls out of the range of 2xx
      console.error('--- EXTERNAL API ERROR RESPONSE ---:', JSON.stringify(err.response.data, null, 2));
      return res.status(err.response.status || 500).json({
        success: false,
        message: `External API Error: ${err.response.data.message || 'Verification failed. Check API key or subscription.'}`,
        error: err.response.data
      });
    } else {
      // Something happened in setting up the request that triggered an Error (e.g. no network)
      console.error('--- INTERNAL/NETWORK ERROR ---:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error during verification.', 
        error: err.message 
      });
    }
  }
};