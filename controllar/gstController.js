const axios = require('axios');
const GstDetails = require('../models/GstDetails');
const User = require('../models/User');





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
          'x-rapidapi-key': '7513cc6ddfmshfdeaa1b235a45ffp1445d6jsn8571db6015fb', // ✅ your valid key
          'x-rapidapi-host': 'gst-return-status.p.rapidapi.com',
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data?.data;
    if (!data || !data.gstin || data.sts !== 'Active') {
      return res.status(400).json({ success: false, message: 'Invalid or unregistered GSTIN' });
    }

    // ✅ Save to GstDetails collection
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

    // ✅ Update GSTIN in User model
    await User.findByIdAndUpdate(
      userId,
      { gstin },
      { new: true }
    );

    return res.status(200).json({ success: true, data: saved });

  } catch (err) {
    console.error('GSTIN verification error:', err.message);
    return res.status(500).json({ success: false, message: 'Verification failed', error: err.message });
  }
};


