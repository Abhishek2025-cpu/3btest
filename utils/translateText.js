// utils/translateText.js
const { Translate } = require('@google-cloud/translate').v2;
const translate = new Translate({ keyFilename: 'google-credentials.json' });

module.exports = async (text, targetLang) => {
  if (!text || !targetLang || targetLang === 'en') return text;
  try {
    const [translation] = await translate.translate(text, targetLang);
    return translation;
  } catch (error) {
    console.error(`Translation failed: ${text}`, error);
    return text;
  }
};
