const express = require('express');
const router = express.Router();
const scholarshipController = require('../controllers/scholarshipController');
const studentController = require('../controllers/studentController'); 

// ============================================
// MAIN SCHOLARSHIP ROUTES
// ============================================
router.post('/scholarship', scholarshipController.saveScholarship);
router.get('/scholarship/:id/details', scholarshipController.getScholarshipWithDetails);
router.get('/scholarships/all', scholarshipController.getAllScholarshipsWithDetails);
router.get('/scholarships', scholarshipController.getAllScholarships);
router.get('/scholarship/app/:appId', scholarshipController.getScholarshipByAppId);
router.get('/scholarship/stats', scholarshipController.getScholarshipStats);

// ============================================
// FAMILY MEMBER ROUTES
// ============================================
router.get('/scholarship/:scholarshipId/family', scholarshipController.getFamilyMembers);
router.put('/family/:id', scholarshipController.updateFamilyMember);
router.delete('/family/:id', scholarshipController.deleteFamilyMember);

// ============================================
// SCHOLARSHIP DETAIL ROUTES
// ============================================
router.get('/scholarship/:scholarshipId/scholarships', scholarshipController.getScholarshipDetails);
router.put('/scholarship-detail/:id', scholarshipController.updateScholarshipDetail);
router.delete('/scholarship-detail/:id', scholarshipController.deleteScholarshipDetail);

// ============================================
// STATUS ROUTES
// ============================================
router.put('/scholarship/:id/status', scholarshipController.updateScholarshipStatus);
router.delete('/scholarship/:id', scholarshipController.deleteScholarship);

// ============================================
// ✅ ADMIN DASHBOARD ROUTES (NEW)
// ============================================
// Get all applications with filters (status, search, pagination)
router.get('/admin/applications', scholarshipController.getAllApplications);

// Get single application by ID with full details
router.get('/admin/application/:id', scholarshipController.getApplicationById);

// Get dashboard statistics (total, pending, approved, rejected, eligible, not eligible)
router.get('/admin/stats', scholarshipController.getDashboardStats);

// Add these to your scholarshipRoutes.js:

// ============================================
// STUDENT DASHBOARD ROUTES
// ============================================
router.get('/student/applications', studentController.getStudentApplications);
router.get('/student/application/:id', studentController.getStudentApplicationById);
router.get('/student/stats', studentController.getStudentStats);
router.get('/student/check', studentController.checkStudentExists);


module.exports = router;