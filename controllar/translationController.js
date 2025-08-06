// controllers/translationController.js
const translateText = require('../translationService');

const translate = async (req, res) => {
  try {
    const { text, language } = req.body;

    if (!text || !language) {
      return res.status(400).json({ error: 'Missing text or language.' });
    }

    const translated = await translateText(text, language);
    res.json({ translated });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed.' });
  }
};

module.exports = { translate };
