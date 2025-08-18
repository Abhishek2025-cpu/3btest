// utils/translateText.js
const { TranslationServiceClient } = require('@google-cloud/translate').v3;
require('dotenv').config();

const client = new TranslationServiceClient();

async function translateText(text, targetLang = 'kn') {
  // Guard clause: Don't translate empty, null, or non-string values
  if (!text || typeof text !== 'string') {
    return text;
  }

  try {
    console.log(`Attempting to translate "${text}" to ${targetLang}`); // <-- ADD THIS LOG

    const projectId = await client.getProjectId();
    const location = 'global';

    const request = {
      parent: `projects/${projectId}/locations/${location}`,
      contents: [text],
      mimeType: 'text/plain',
      sourceLanguageCode: 'en',
      targetLanguageCode: targetLang,
    };

    const [response] = await client.translateText(request);
    
    if (response.translations && response.translations.length > 0) {
      const translated = response.translations[0].translatedText;
      console.log(`Successfully translated "${text}" to "${translated}"`); // <-- ADD THIS LOG
      return translated;
    } else {
      // If Google returns no translation, return the original text
      console.warn(`Translation for "${text}" returned no result. Returning original.`);
      return text;
    }

  } catch (error) {
    // --- THIS IS THE MOST IMPORTANT PART ---
    // If the API call fails (permissions, etc.), it will be caught here.
    console.error(`Error translating text: "${text}". Error:`, error.message);
    // Return the original text so the app doesn't crash
    return text;
  }
}

module.exports = translateText;