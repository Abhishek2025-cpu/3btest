const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const controller = require('../controllar/item.controller');


router.post('/add-items', upload.single('productImage'), controller.createItemWithBoxes);
router.put('/update', upload.single('productImage'), controller.updateItemWithBoxes);
router.get('/get-items', controller.getAllItems);
router.get('/single/:id', controller.getItemById);
router.get('/get-Allitems', controller.getAllItemsForList);
router.get('/items/employee/:employeeId', controller.getEmployeeAssignedProducts);
router.get('/item/:itemNo', controller.getItemByItemNo);
router.delete('/delete-items/:id', controller.deleteItem);
router.patch('/:id/add-boxes', controller.addBoxesToItem);
router.patch('/update-stock-status/:id', controller.updateStockStatus);
module.exports = router;