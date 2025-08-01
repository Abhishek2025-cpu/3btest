// routes/company.routes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const companyController = require('../controllar/company.controller');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST /api/companies - Create a new company
// upload.single('logo') expects a file in a form-data field named 'logo'
router.post('/add-company', upload.single('logo'), companyController.addCompany);
// PUT /api/companies/:id - Update a company
router.put(
    '/update/:id', 
    upload.single('logo'), // Also use multer here for potential logo updates
    companyController.updateCompany
);

// DELETE /api/companies/:id - Delete a company
router.delete('/delete/:id', companyController.deleteCompany);

// GET /api/companies - Get all companies for dropdowns
router.get('/get-company', companyController.getAllCompanies);

module.exports = router;