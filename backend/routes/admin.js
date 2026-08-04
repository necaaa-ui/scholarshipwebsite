const express = require('express');
const router = express.Router();
const scholarshipController = require('../controllers/scholarshipController');

// Both endpoints use the same controller function
router.get('/admin/applications', scholarshipController.getAllApplications);
router.get('/admin/applications/all', scholarshipController.getAllApplications);

// Other routes
router.get('/admin/applications/:id', scholarshipController.getApplicationById);
router.get('/admin/stats', scholarshipController.getDashboardStats);
router.put('/scholarship/:id/status', scholarshipController.updateScholarshipStatus);

module.exports = router;