const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const controller = require('../controllar/item.controller');



router.post('/add-items', upload.single('productImage'), controller.createItemWithBoxes);
router.get('/get-items', controller.getAllItems);
router.get('/get-Allitems', controller.getAllItemsForList);
router.get('/item/:itemNo', controller.getItemByItemNo);
router.delete('/delete-items/:id', controller.deleteItem);
router.patch('/add-boxes/:id', controller.addBoxesToItem);
router.patch('/update-stock-status/:id', controller.updateStockStatus);


module.exports = router;