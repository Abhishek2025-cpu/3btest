const express = require('express');
const router = express.Router();

const orderController = require('../controllar/orderController');
const { checkPermission } = require('../middleware/checkPermission');

console.log(orderController);

/**
 * 🔐 PLACE ORDER
 */
router.post(
  '/place-order',
  checkPermission('orders'),
  orderController.placeOrder
);

/**
 * 🔐 GET ALL ORDERS
 */
router.get(
  '/get-orders',
  checkPermission('orders'),
  orderController.getOrders
);

/**
 * 🔐 GET USER ORDERS
 */
router.get(
  '/get-orders/:userId',
  checkPermission('orders'),
  orderController.getOrdersByUserId
);

/**
 * 🔐 UPDATE ORDER STATUS
 */
router.patch(
  '/status/:id',
  checkPermission('orders'),
  orderController.updateOrderStatusById
);

/**
 * 🔐 TOGGLE RETURN ELIGIBILITY
 */
router.patch(
  '/:orderId/return-eligibility',
  checkPermission('orders'),
  orderController.toggleReturnEligibility
);

module.exports = router;