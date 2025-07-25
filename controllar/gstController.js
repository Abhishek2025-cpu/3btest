const axios = require('axios');
const GstDetails = require('../models/GstDetails');



exports.verifyAndSaveGSTIN = async (req, res) => {
  const { userId, gstin } = req.body;

  if (!userId || !gstin) {
    return res.status(400).json({ success: false, message: 'userId and gstin are required' });
  }

  try {
    const response = await axios.post(
      'https://gstin-bulk-verification1.p.rapidapi.com/v1.0/verifyGSTIN',
      { gstin: [gstin] },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': '33e17d9fa16359016cd870164c111452',
          'X-RapidAPI-Host': 'gstin-bulk-verification1.p.rapidapi.com'
        }
      }
    );

    const data = response.data?.data?.[0];

    if (!data || data.valid_gstin !== true) {
      return res.status(400).json({ success: false, message: 'Invalid or unregistered GSTIN' });
    }

    const saved = await GstDetails.findOneAndUpdate(
      { userId },
      {
        userId,
        gstin,
        legalName: data.legal_name,
        tradeName: data.trade_name,
        state: data.state
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({ success: true, data: saved });

  } catch (err) {
    console.error('GSTIN verification error:', err.message);
    return res.status(500).json({ success: false, message: 'Verification failed', error: err.message });
  }
};

