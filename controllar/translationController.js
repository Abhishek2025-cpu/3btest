// Import required models
const Product = require('../models/ProductUpload');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Feedback = require('../models/feedback');
const User = require('../models/User');
const OtherProduct = require('../models/otherProduct');
const OtherCategory = require('../models/otherCategory');
const Company = require('../models/company');

// Import translation utility
const translateText = require('../utils/translateText');

// Helper function to translate specified fields in an object
const translateFields = async (item, fields, lang) => {
    const translated = item.toObject();

  for (const field of fields) {
    if (field.includes('.')) {
      // Handle nested fields like 'shippingDetails.name' or 'materials.materialName'
      const parts = field.split('.');
      let current = translated;

      for (let i = 0; i < parts.length - 1; i++) {
        current = current?.[parts[i]];
        if (!current) break;
      }

      const lastKey = parts[parts.length - 1];

      if (Array.isArray(current)) {
        for (const el of current) {
          if (el[lastKey]) {
            el[lastKey] = await translateText(el[lastKey], lang);
          }
        }
      } else if (current?.[lastKey]) {
        current[lastKey] = await translateText(current[lastKey], lang);
      }

    } else if (translated[field]) {
      translated[field] = await translateText(translated[field], lang);
    }
  }

  return translated;
};

// Controller function: Get all translated data
const getAllTranslatedData = async (req, res) => {
  try {
    const { lang } = req.query;

    const categories = await Category.find();
    const products = await Product.find();
    const items = await OtherProduct.find().populate('category');
    const feedbacks = await Feedback.find({ isPrivate: false }).populate('user');
    const companies = await Company.find();

    const translatedCategories = lang ? await Promise.all(categories.map(cat =>
      translateFields(cat, ['name'], lang)
    )) : categories;

    const translatedProducts = lang ? await Promise.all(products.map(prod =>
      translateFields(prod, ['name', 'about'], lang)
    )) : products;

    const translatedItems = lang ? await Promise.all(items.map(item =>
      translateFields(item, ['productName', 'details', 'materials.materialName'], lang)
    )) : items;

    const translatedFeedbacks = lang ? await Promise.all(feedbacks.map(fb =>
      translateFields(fb, ['message'], lang)
    )) : feedbacks;

    const translatedCompanies = lang ? await Promise.all(companies.map(comp =>
      translateFields(comp, ['name'], lang)
    )) : companies;

    res.json({
      categories: translatedCategories,
      products: translatedProducts,
      items: translatedItems,
      feedbacks: translatedFeedbacks,
      companies: translatedCompanies
    });
  } catch (err) {
    console.error('Translation error:', err);
    res.status(500).json({ error: 'Failed to get translated data' });
  }
};

// Export the function
module.exports = {
  getAllTranslatedData
};
