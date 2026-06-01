const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly, platformAdminOnly } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');

router.use(protect, adminOnly);

router.get('/dashboard', adminController.getDashboard);

// Schools
router.get('/schools', adminController.getSchools);
router.get('/schools/add', adminController.getAddSchool);
router.post('/schools', imageUpload.fields([{ name: 'logo', maxCount: 1 }, { name: 'hero', maxCount: 1 }]), adminController.createSchool);
router.get('/schools/:id/edit', adminController.getEditSchool);
router.post('/schools/:id/edit', imageUpload.fields([{ name: 'logo', maxCount: 1 }, { name: 'hero', maxCount: 1 }]), adminController.updateSchool);
router.delete('/schools/:id', adminController.deleteSchool);

// Scholarships
router.get('/scholarships', adminController.getScholarships);
router.post('/scholarships', adminController.createScholarship);
router.get('/scholarships/:id/edit', adminController.getEditScholarship);
router.post('/scholarships/:id/edit', adminController.updateScholarship);

// Applications
router.get('/applications', adminController.getApplications);
router.get('/applications/:id', adminController.getApplicationDetail);
router.patch('/applications/:id/status', adminController.updateApplicationStatus);

// Offers
router.get('/offers', adminController.getOffers);
router.post('/applications/:applicationId/offer', adminController.issueOffer);

// Payments
router.get('/payments', adminController.getPayments);
router.patch('/payments/:id/verify', adminController.verifyPayment);

// Users
router.get('/users', platformAdminOnly, adminController.getUsers);
router.post('/users/admin', platformAdminOnly, adminController.createAdmin);

// Audit Logs
router.get('/audit-logs', platformAdminOnly, adminController.getAuditLogs);

// Bank Details
router.get('/bank-details', adminController.getBankDetails);
router.post('/bank-details', adminController.saveBankDetails);

module.exports = router;