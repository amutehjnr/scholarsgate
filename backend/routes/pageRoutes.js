// pageRoutes.js
const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, pageController.getHomepage);
router.get('/schools', optionalAuth, pageController.getSchools);
router.get('/schools/:slug', optionalAuth, pageController.getSchoolDetail);
router.get('/scholarships', optionalAuth, pageController.getScholarships);
router.get('/scholarships/:slug', optionalAuth, pageController.getScholarshipDetail);
router.get('/about', optionalAuth, pageController.getAbout);
router.get('/contact', optionalAuth, pageController.getContact);
router.get('/faq', optionalAuth, pageController.getFaq);

module.exports = router;
