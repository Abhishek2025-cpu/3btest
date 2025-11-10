// services/translation.service.js

const translateText = require('../utils/translateText');

const translateSingleItem = async (item, fields, lang) => {

  const translated = JSON.parse(JSON.stringify(item));

  for (const field of fields) {
    if (field.includes('.')) {
      const parts = field.split('.');
      let current = translated;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current?.[parts[i]];
        if (!current) break;
      }
      const lastKey = parts[parts.length - 1];
      if (Array.isArray(current)) {
        await Promise.all(current.map(async (el) => {
          if (el && el[lastKey]) {
            el[lastKey] = await translateText(el[lastKey], lang);
          }
        }));
      } else if (current?.[lastKey]) {
        current[lastKey] = await translateText(current[lastKey], lang);
      }
    } else if (translated[field]) {
      translated[field] = await translateText(translated[field], lang);
    }
  }
  return translated;
};

const translateResponse = async (req, data, fieldsToTranslate) => {
  const { lang } = req.query;

  // Added a log to be sure the lang parameter is detected
  if (lang) {
    console.log(`Translation requested for language: ${lang}`);
  } else {
    return data; // No language parameter, return original data
  }

  if (!data) {
    return data;
  }

  if (Array.isArray(data)) {
    return Promise.all(
      data.map(item => translateSingleItem(item, fieldsToTranslate, lang))
    );
  }

  return translateSingleItem(data, fieldsToTranslate, lang);
};

module.exports = { translateResponse };