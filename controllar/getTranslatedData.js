// controllers/getTranslatedData.js

const Product = require('../models/ProductUpload');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Feedback = require('../models/feedback');
const OtherProduct = require('../models/otherProduct');
const Company = require('../models/company');
const translateFields = require('../utils/translateText'); // or wherever your helper is

module.exports.getTranslatedData = async (req, res) => {
  try {
    const { lang } = req.query;

    const [
      categories,
      products,
      items,
      companies,
      orders,
      feedbacks
    ] = await Promise.all([
      Category.find(),
      Product.find(),
      OtherProduct.find().populate('category'),
      Company.find(),
      Order.find(),
      Feedback.find({ isPrivate: false }).populate('user')
    ]);

    const [translatedCategories, translatedProducts, translatedItems, translatedCompanies, translatedOrders, translatedFeedbacks] = lang
      ? await Promise.all([
          Promise.all(categories.map(cat => translateFields(cat, ['name'], lang))),
          Promise.all(products.map(prod => translateFields(prod, ['name', 'about'], lang))),
          Promise.all(items.map(item => translateFields(item, ['productName', 'details'], lang))),
          Promise.all(companies.map(comp => translateFields(comp, ['name'], lang))),
          Promise.all(orders.map(order => translateFields(order, ['shippingDetails.name', 'shippingDetails.addressType', 'shippingDetails.detailedAddress'], lang))),
          Promise.all(feedbacks.map(fb => translateFields(fb, ['message'], lang)))
        ])
      : [categories, products, items, companies, orders, feedbacks];

    res.json({
      categories: translatedCategories,
      products: translatedProducts,
      items: translatedItems,
      companies: translatedCompanies,
      orders: translatedOrders,
      feedbacks: translatedFeedbacks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch translated data' });
  }
};
