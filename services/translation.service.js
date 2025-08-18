// services/translation.service.js

const translateText = require('../utils/translateText');

/**
 * Translates specific fields within a single Mongoose document object.
 * @param {object} item - A Mongoose document (it will be converted to an object).
 * @param {string[]} fields - An array of field names to translate, e.g., ['name', 'materials.materialName'].
 * @param {string} lang - The target language code, e.g., 'hi'.
 * @returns {Promise<object>} The translated plain JavaScript object.
 */
const translateSingleItem = async (item, fields, lang) => {
  // Use .toObject() for a safe, plain JavaScript object from a Mongoose doc
  const translated = item.toObject ? item.toObject() : { ...item };

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

/**
 * A wrapper function that checks for a 'lang' query param and translates data if present.
 * It can handle either a single object or an array of objects.
 * @param {object} req - The Express request object.
 * @param {object|object[]} data - The data to be potentially translated (Mongoose docs or arrays of them).
 * @param {string[]} fieldsToTranslate - The fields that need translation.
 * @returns {Promise<object|object[]>} The translated or original data.
 */
const translateResponse = async (req, data, fieldsToTranslate) => {
  const { lang } = req.query;

  // If no language parameter or no data, return the original data immediately.
  if (!lang || !data) {
    return data;
  }

  // Handle case where data is an array
  if (Array.isArray(data)) {
    return Promise.all(
      data.map(item => translateSingleItem(item, fieldsToTranslate, lang))
    );
  }

  // Handle case where data is a single object
  return translateSingleItem(data, fieldsToTranslate, lang);
};

module.exports = { translateResponse };