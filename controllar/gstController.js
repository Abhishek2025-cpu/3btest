const axios = require('axios');
const GstDetails = require('../models/GstDetails');
const User = require('../models/User');

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

    // ================== CRITICAL DEBUGGING STEP ==================
    // Log the actual response from the external API to your server console.
    console.log('--- RAW API RESPONSE ---:', JSON.stringify(response.data, null, 2));
    // =============================================================

    const data = response.data;

    if (!data || data.success === false || data.sts !== 'Active') {
      return res.status(400).json({ success: false, message: 'Invalid or unregistered GSTIN, or API error.' });
    }

    const saved = await GstDetails.findOneAndUpdate(
      { userId },
      {
        userId,
        gstin: data.gstin,
        legalName: data.lgnm,
        tradeName: data.tradeNam,
        state: data.pradr?.st || null
      },
      { new: true, upsert: true }
    );

    await User.findByIdAndUpdate(
      userId,
      { gstin },
      { new: true }
    );

    return res.status(200).json({ success: true, data: saved });

  } catch (err) {
    // ================== CRITICAL DEBUGGING STEP ==================
    // If the entire request fails, log the error details.
    if (err.response) {
      console.error('--- RAW API ERROR RESPONSE ---:', JSON.stringify(err.response.data, null, 2));
      return res.status(err.response.status || 500).json({
        success: false,
        message: 'Verification failed due to an external API error.',
        error: err.response.data
      });
    }
    // =============================================================
    
    console.error('GSTIN verification internal error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during verification.', error: err.message });
  }
};