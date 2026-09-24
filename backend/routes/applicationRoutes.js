// applicationRoutes.js
const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { protect, guardianOnly } = require('../middleware/auth');
const { documentUpload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');

router.use(protect, guardianOnly);
router.get('/apply/:scholarshipSlug', applicationController.getApplyPage);
router.post('/apply/:scholarshipSlug', uploadLimiter, documentUpload.single('proof'), applicationController.submitApplication);

module.exports = router;