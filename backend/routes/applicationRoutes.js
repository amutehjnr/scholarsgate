// applicationRoutes.js
const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { protect, guardianOnly } = require('../middleware/auth');

router.use(protect, guardianOnly);
router.get('/apply/:scholarshipSlug', applicationController.getApplyPage);
router.post('/apply/:scholarshipSlug', applicationController.submitApplication);

module.exports = router;
