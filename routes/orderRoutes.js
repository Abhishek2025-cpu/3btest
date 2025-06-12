// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/orderController');

router.post('/place-order', orderController.placeOrder);
router.get('/get-orders', orderController.getOrders);
router.get('/get-orders/:userId', orderController.getOrdersByUserId);
router.patch('/status/:id', orderController.updateOrderStatusById);

module.exports = router;
