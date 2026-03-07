const express = require('express');
const router = express.Router();
const { getAllRoles } = require('../controllar/employeesController'); 



router.get('/roles/all', getAllRoles);

module.exports = router;