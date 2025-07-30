const axios = require('axios');
const GstDetails = require('../models/GstDetails');
const User = require('../models/User');

// It's a best practice to store secrets like API keys in environment variables
// instead of hardcoding them in the source code.
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '7513cc6ddfmshfdeaa1b235a45ffp1445d6jsn8571db6015fb';

exports.verifyAndSaveGSTIN = async (req, res) => {
  const { userId, gstin } = req.query;

  if (!userId || !gstin) {
    return res.status(400).json({ success: false, message: 'userId and gstin are required' });
  }

  try {
    const response = await axios.get(
      `https://gst-return-status.p.rapidapi.com/free/gstin/${gstin}`,
      {
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'gst-return-status.p.rapidapi.com',
        }
      }
    );

    // --- FIX STARTS HERE ---

    // 1. Work directly with the response data, don't look for a nested 'data' object.
    const data = response.data;

    // For debugging, it's always good to log the actual response
    // console.log('API Response:', JSON.stringify(data, null, 2));

    // 2. Check the response success flag and status.
    //    Also check if the API itself indicated success.
    if (!data || data.success === false || data.sts !== 'Active') {
      return res.status(400).json({ success: false, message: 'Invalid or unregistered GSTIN, or API error.' });
    }

    // 3. Update the GstDetails collection with the correct field names from the API.
    const saved = await GstDetails.findOneAndUpdate(
      { userId },
      {
        userId,
        gstin: data.gstin,
        legalName: data.lgnm,
        tradeName: data.tradeNam, // The API key is often 'tradeNam'
        state: data.pradr?.st || null // State is often in the principal address object
      },
      { new: true, upsert: true }
    );

    // --- FIX ENDS HERE ---

    // Update GSTIN in User model
    await User.findByIdAndUpdate(
      userId,
      { gstin }, // you might want to save the full GSTIN object reference here instead
      { new: true }
    );

    return res.status(200).json({ success: true, data: saved });

  } catch (err) {
    // Log the detailed error from Axios if it exists
    if (err.response) {
      console.error('GSTIN API Error Response:', err.response.data);
      return res.status(err.response.status || 500).json({ 
        success: false, 
        message: 'Verification failed due to an external API error.', 
        error: err.response.data 
      });
    }
    console.error('GSTIN verification internal error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during verification.', error: err.message });
  }
};