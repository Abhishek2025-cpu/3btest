const axios = require('axios');
const GstDetails = require('../models/GstDetails');

const axios = require('axios');
const GstDetails = require('../models/GstDetails');

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
          'x-rapidapi-key': '33e17d9fa16359016cd870164c111452',
          'x-rapidapi-host': 'gst-return-status.p.rapidapi.com'
        }
      }
    );

    console.log('GST API Response:', response.data);

    const data = response.data?.data;

    if (!data || !data.gstin || data.sts !== 'Active') {
      return res.status(400).json({ success: false, message: 'Invalid or unregistered GSTIN' });
    }

    const saved = await GstDetails.findOneAndUpdate(
      { userId },
      {
        userId,
        gstin,
        legalName: data.lgnm,
        tradeName: data.tradeName,
        state: data.state || null
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({ success: true, data: saved });

  } catch (err) {
    console.error('GSTIN verification error:', err);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: err?.response?.data || err.message || 'Unknown error'
    });
  }
};

