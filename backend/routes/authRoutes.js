const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuthenticated, protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.get('/login', redirectIfAuthenticated, (req, res) =>
  res.render('pages/auth/login', { title: 'Sign In' }));

router.get('/register', redirectIfAuthenticated, (req, res) =>
  res.render('pages/auth/register', { title: 'Create Account' }));

router.get('/forgot-password', (req, res) =>
  res.render('pages/auth/forgot-password', { title: 'Reset Password' }));

router.get('/reset-password/:token', (req, res) =>
  res.render('pages/auth/reset-password', { title: 'Set New Password', token: req.params.token }));

router.get('/admin/login', redirectIfAuthenticated, (req, res) =>
  res.render('pages/auth/admin-login', { title: 'Admin Login' }));

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/admin/login', authLimiter, authController.adminLogin);
router.post('/logout', protect, authController.logout);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
