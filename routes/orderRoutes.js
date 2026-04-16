const express = require('express');
const router = express.Router();
const orderController = require('../controllar/orderController'); // <-- fix path
console.log(orderController);

router.post('/place-order', orderController.placeOrder);
router.get('/get-orders', orderController.getOrders);
router.get('/get-orders/:userId', orderController.getOrdersByUserId);
router.patch('/status/:id', orderController.updateOrderStatusById);
router.patch('/:orderId/return-eligibility', orderController.toggleReturnEligibility);

module.exports = router;
