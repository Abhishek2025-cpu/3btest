const express = require('express');
const router = express.Router();
const {
  addAddress,
  updateAddress,
  deleteAddress,
  getShippingAddresses
} = require('../Controllers/shippingAddressController');

router.post('/user/:userId/address', addAddress);
router.put('/user/:userId/address/:addressId', updateAddress);
router.delete('/user/:userId/address/:addressId', deleteAddress);
router.get('/user/:userId/addresses', getShippingAddresses);

module.exports = router;
