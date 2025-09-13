// controllers/billingController.js
const Billing = require("../models/Billing");
const Order = require("../models/Order");
const User = require("../models/User");

// Create Billing
const createBilling = async (req, res) => {
  try {
    const { orderId, ...billingData } = req.body;

    // 1. Find Order
    const order = await Order.findOne({ orderId }).populate("userId", "-address -password -__v");
    if (!order) return res.status(404).json({ error: "Order not found" });

    // 2. Get user details (excluding address)
    const user = order.userId;
    const buyerDetails = `Name: ${user.name}\nEmail: ${user.email}\nPhone: ${user.phone}`;

    // 3. Create Billing
    const billing = new Billing({
      orderId: order._id,
      buyerDetails,
      ...billingData,
    });

    await billing.save();
    res.status(201).json({ message: "Billing created successfully", billing });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get All Billings
const getBillings = async (req, res) => {
  try {
    const billings = await Billing.find();
    res.status(200).json(billings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Single Billing by ID
const getBillingById = async (req, res) => {
  try {
    const billing = await Billing.findById(req.params.id);
    if (!billing) return res.status(404).json({ error: "Billing not found" });
    res.status(200).json(billing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Billing
const updateBilling = async (req, res) => {
  try {
    const billing = await Billing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!billing) return res.status(404).json({ error: "Billing not found" });
    res.status(200).json({ message: "Billing updated successfully", billing });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Billing
const deleteBilling = async (req, res) => {
  try {
    const billing = await Billing.findByIdAndDelete(req.params.id);
    if (!billing) return res.status(404).json({ error: "Billing not found" });
    res.status(200).json({ message: "Billing deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createBilling,
  getBillings,
  getBillingById,
  updateBilling,
  deleteBilling,
};
