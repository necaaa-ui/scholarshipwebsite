const express = require('express');
const router = express.Router();
const scholarshipController = require('../controllers/scholarshipController');

// Additional admin routes (main admin routes are in scholarshipRoutes.js)
router.get('/admin/applications/all', scholarshipController.getAllApplications);

module.exports = router;