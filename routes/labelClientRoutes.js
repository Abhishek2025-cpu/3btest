const express = require('express');
const router = express.Router();
const labelController = require('../controllar/labelClientController');

router.post('/add', labelController.addLabelClients);
router.get('/list', labelController.getLabelClients);
router.put('/update/:id', labelController.updateLabel);
router.delete('/delete/:id', labelController.deleteLabel);

module.exports = router;