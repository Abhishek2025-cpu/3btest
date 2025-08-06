// translationService.js
const { TranslationServiceClient } = require('@google-cloud/translate').v3;
require('dotenv').config();

const client = new TranslationServiceClient();

async function translateText(text, targetLang = 'kn') {
  const projectId = (await client.getProjectId()); // Automatically picks project ID
  const location = 'global';

  const request = {
    parent: `projects/${projectId}/locations/${location}`,
    contents: [text],
    mimeType: 'text/plain',
    sourceLanguageCode: 'en',
    targetLanguageCode: targetLang,
  };

  const [response] = await client.translateText(request);
  return response.translations[0].translatedText;
}

module.exports = translateText;
