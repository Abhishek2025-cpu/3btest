const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const controller = require('../controllar/item.controller');

router.post('/add-items', upload.single('productImage'), controller.createItem);
router.get('/get-items', controller.getItems);
router.delete('/delete-items/:id', controller.deleteItem);
router.patch('/update-stock-status/:id', controller.updateStockStatus);


module.exports = router;