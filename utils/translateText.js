// utils/translateText.js
const axios = require('axios');
require('dotenv').config();

// Get the API key from the environment variable you set in Cloud Run
const API_KEY = process.env.TRANSLATION_API_KEY;

// The Google Translate API endpoint
const API_URL = 'https://translation.googleapis.com/language/translate/v2';

async function translateText(text, targetLang = 'kn') {
  // Guard clause: Don't translate empty, null, or non-string values
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Guard clause: Ensure the API key is available
  if (!API_KEY) {
    console.error('TRANSLATION_API_KEY environment variable not set.');
    // Return original text if key is missing so the app doesn't crash
    return text; 
  }

  try {
    console.log(`Attempting to translate "${text}" to ${targetLang} using API Key.`);

    const response = await axios.post(
      `${API_URL}?key=${API_KEY}`,
      {
        q: text,
        source: 'en',
        target: targetLang,
        format: 'text'
      }
    );

    // Extract the translated text from the response
    if (response.data && response.data.data && response.data.data.translations) {
      const translated = response.data.data.translations[0].translatedText;
      console.log(`Successfully translated "${text}" to "${translated}"`);
      return translated;
    } else {
      console.warn(`Translation for "${text}" returned an unexpected response structure.`, response.data);
      return text;
    }

  } catch (error) {
    console.error(`Error translating text: "${text}". Error:`, error.response ? error.response.data : error.message);
    // Return the original text so the app doesn't crash
    return text;
  }
}

module.exports = translateText;