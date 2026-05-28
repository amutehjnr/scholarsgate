// parentRoutes.js
const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { protect, guardianOnly } = require('../middleware/auth');
const { imageUpload, documentUpload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');

router.use(protect, guardianOnly);

router.get('/dashboard', parentController.getDashboard);
router.get('/students', parentController.getStudents);
router.get('/students/add', parentController.getAddStudent);
router.post('/students', imageUpload.single('photo'), parentController.addStudent);
router.get('/students/:id', parentController.getStudent);
router.put('/students/:id', imageUpload.single('photo'), parentController.updateStudent);
router.post('/students/:studentId/documents/:docType', uploadLimiter, documentUpload.single('file'), parentController.uploadDocument);
router.get('/applications', parentController.getApplications);
router.get('/applications/:id', parentController.getApplicationDetail);
router.get('/offers', parentController.getOffers);
router.post('/offers/:id/accept', parentController.acceptOffer);
router.get('/offers/:id/payment', parentController.getPaymentPage);
router.post('/offers/:offerId/payment', uploadLimiter, documentUpload.single('proof'), parentController.submitPayment);
router.get('/notifications', parentController.getNotifications);
router.get('/settings', parentController.getSettings);
router.post('/settings', imageUpload.single('avatar'), parentController.updateSettings);

module.exports = router;
