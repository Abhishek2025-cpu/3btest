// utils/translateText.js
const axios = require('axios');
require('dotenv').config();

// Get the API key from the environment variable you set in Cloud Run
const API_KEY = process.env.TRANSLATION_API_KEY;

// The Google Translate API endpoint
const API_URL = 'https://translation.googleapis.com/language/translate/v2';
async function translateText(text, targetLang = 'kn') {
  if (!text || typeof text !== 'string') return text;
  if (!API_KEY) {
    console.error('TRANSLATION_API_KEY not set');
    return text;
  }

  try {
    const response = await axios.post(
      `${API_URL}?key=${API_KEY}`,
      {
        q: text,
        target: targetLang,
        format: 'text'
      }
    );

    const translations = response.data?.data?.translations;
    if (translations?.length > 0) {
      return translations[0].translatedText;
    }
    console.warn("Unexpected response:", response.data);
    return text;

  } catch (error) {
    console.error("Translation API error:", error.response?.data || error.message);
    return text;
  }
}


module.exports = translateText;