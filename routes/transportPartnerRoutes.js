// routes/transportPartnerRoutes.js
const express = require('express');
const router = express.Router();
const transportPartnerController = require('../controllar/transportPartnerController'); 

// Define routes
router.post('/add-transporter', transportPartnerController.addTransportPartner);
router.get('/get-transpoters', transportPartnerController.getTransportPartners);
router.delete('/delete/:id', transportPartnerController.deleteTransportPartner);

module.exports = router;