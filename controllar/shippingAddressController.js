const User = require('../models/User');
const { translateResponse } = require('../services/translation.service');

const shippingAddressFieldsToTranslate = [
  'addressType' 
];

// Add Address
exports.addAddress = async (req, res) => {
  const { userId } = req.params;
  const { name, phone, addressType, detailedAddress } = req.body;

  if (!name || !phone || !addressType || !detailedAddress) {
    return res.status(400).json({ message: 'All address fields are required' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.shippingAddresses.length >= 5) {
      return res.status(400).json({ message: 'Maximum 5 addresses allowed' });
    }

    user.shippingAddresses.push({ name, phone, addressType, detailedAddress });
    await user.save();

    res.status(201).json({ message: 'Address added', addresses: user.shippingAddresses });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add address', error: err.message });
  }
};

// Update Address
exports.updateAddress = async (req, res) => {
  const { userId, addressId } = req.params;
  const { name, phone, addressType, detailedAddress } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const address = user.shippingAddresses.id(addressId);
    if (!address) return res.status(404).json({ message: 'Address not found' });

    if (name) address.name = name;
    if (phone) address.phone = phone;
    if (addressType) address.addressType = addressType;
    if (detailedAddress) address.detailedAddress = detailedAddress;

    await user.save();

    res.status(200).json({ message: 'Address updated', addresses: user.shippingAddresses });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update address', error: err.message });
  }
};

// Delete Address
exports.deleteAddress = async (req, res) => {
  const { userId, addressId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Remove address by id using pull
    user.shippingAddresses.pull({ _id: addressId });

    await user.save();

    res.status(200).json({ message: 'Address deleted', addresses: user.shippingAddresses });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete address', error: err.message });
  }
};




// GET /api/user/:userId/addresses
exports.getShippingAddresses = async (req, res) => {
  const { userId } = req.params;

  try {
    // Step 1: Find the user and get their addresses. Use .lean() for performance.
    const user = await User.findById(userId).select('shippingAddresses').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '❌ User not found'
      });
    }

    // `user.shippingAddresses` is the array we need to translate.
    // It will be an empty array if the user has no addresses, which is handled correctly.
    
    // Step 2: Pass the addresses array to the translation service
    const translatedAddresses = await translateResponse(req, user.shippingAddresses, shippingAddressFieldsToTranslate);

    // Step 3: Send a consistent, successful response
    res.status(200).json({
      success: true,
      message: '✅ Shipping addresses fetched successfully',
      shippingAddresses: translatedAddresses // Use the translated array
    });
    
  } catch (error) {
    // Step 4: Use consistent error handling
    console.error('❌ Error fetching shipping addresses:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to fetch shipping addresses',
      error: error.message
    });
  }
};

