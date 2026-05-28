const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Guardian = require('../models/Guardian');
const { Admin, AuditLog } = require('../models/index');
const AppError = require('../utils/AppError');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '15m' });

const signRefreshToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' });

const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/auth/refresh',
  });
};

// ─── Register ─────────────────────────────────────────────
exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password, country, phone } = req.body;

  const existing = await Guardian.findOne({ email });
  if (existing) return next(new AppError('Email already registered.', 400));

  const guardian = await Guardian.create({ firstName, lastName, email, password, country, phone });

  const verifyToken = crypto.randomBytes(32).toString('hex');
  guardian.emailVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  guardian.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await guardian.save({ validateBeforeSave: false });

  const verifyUrl = `${process.env.APP_URL}/auth/verify-email/${verifyToken}`;

  try {
    await sendEmail({
      to: guardian.email,
      subject: 'Welcome to ScholarsGate — Verify Your Email',
      template: 'welcome',
      data: { firstName: guardian.firstName, verifyUrl },
    });
  } catch (err) {
    logger.error('Welcome email failed: ' + err.message);
  }

  req.session.flash = { success: 'Account created! Please verify your email.' };
  res.redirect('/auth/login');
};

// ─── Login ────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  const guardian = await Guardian.findOne({ email }).select('+password +loginAttempts +lockUntil');

  if (!guardian) return next(new AppError('Invalid email or password.', 401));

  if (guardian.isLocked()) {
    return next(new AppError('Account temporarily locked. Try again in 2 hours.', 423));
  }

  const isMatch = await guardian.matchPassword(password);
  if (!isMatch) {
    await guardian.incrementLoginAttempts();
    return next(new AppError('Invalid email or password.', 401));
  }

  if (!guardian.isActive) return next(new AppError('Account is deactivated. Contact support.', 403));

  // Reset attempts
  if (guardian.loginAttempts > 0) {
    await guardian.updateOne({ $set: { loginAttempts: 0, lastLogin: new Date() }, $unset: { lockUntil: 1 } });
  } else {
    guardian.lastLogin = new Date();
    await guardian.save({ validateBeforeSave: false });
  }

  const accessToken = signToken(guardian._id, 'guardian');
  const refreshToken = signRefreshToken(guardian._id, 'guardian');

  guardian.refreshTokens.push({ token: refreshToken });
  if (guardian.refreshTokens.length > 5) guardian.refreshTokens.shift();
  await guardian.save({ validateBeforeSave: false });

  setTokenCookies(res, accessToken, refreshToken);
  req.session.user = { id: guardian._id, role: 'guardian', name: guardian.fullName };

  await AuditLog.create({
    actor: guardian._id, actorModel: 'Guardian', actorEmail: guardian.email,
    action: 'LOGIN', resource: 'Auth', status: 'success',
    ipAddress: req.ip, userAgent: req.get('User-Agent'),
  });

  res.redirect('/parent/dashboard');
};

// ─── Admin Login ──────────────────────────────────────────
exports.adminLogin = async (req, res, next) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email }).select('+password');

  if (!admin || !await admin.matchPassword(password)) {
    return next(new AppError('Invalid credentials.', 401));
  }

  if (!admin.isActive) return next(new AppError('Account is deactivated.', 403));

  admin.lastLogin = new Date();
  const accessToken = signToken(admin._id, admin.role);
  const refreshToken = signRefreshToken(admin._id, admin.role);
  admin.refreshTokens.push({ token: refreshToken });
  if (admin.refreshTokens.length > 5) admin.refreshTokens.shift();
  await admin.save({ validateBeforeSave: false });

  setTokenCookies(res, accessToken, refreshToken);
  req.session.user = { id: admin._id, role: admin.role, name: admin.fullName };

  res.redirect('/admin/dashboard');
};

// ─── Logout ───────────────────────────────────────────────
exports.logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken && req.user) {
    try {
      const Model = req.user.userType === 'admin' ? Admin : Guardian;
      await Model.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
    } catch {}
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/auth/refresh' });
  req.session.destroy();
  res.redirect('/');
};

// ─── Refresh Token ────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) return next(new AppError('No refresh token.', 401));

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const Model = decoded.role === 'guardian' ? Guardian : Admin;
    const user = await Model.findById(decoded.id);

    if (!user || !user.refreshTokens.some(t => t.token === token)) {
      return next(new AppError('Invalid refresh token.', 401));
    }

    const newAccess = signToken(user._id, decoded.role);
    res.cookie('accessToken', newAccess, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });

    res.json({ success: true });
  } catch {
    next(new AppError('Invalid refresh token.', 401));
  }
};

// ─── Forgot Password ──────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  const guardian = await Guardian.findOne({ email });

  if (!guardian) {
    req.session.flash = { success: 'If that email exists, a reset link has been sent.' };
    return res.redirect('/auth/forgot-password');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  guardian.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  guardian.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  await guardian.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.APP_URL}/auth/reset-password/${resetToken}`;
  await sendEmail({
    to: guardian.email,
    subject: 'ScholarsGate — Password Reset Request',
    template: 'resetPassword',
    data: { firstName: guardian.firstName, resetUrl },
  });

  req.session.flash = { success: 'Password reset link sent to your email.' };
  res.redirect('/auth/forgot-password');
};

// ─── Reset Password ───────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const guardian = await Guardian.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!guardian) return next(new AppError('Invalid or expired reset token.', 400));

  guardian.password = req.body.password;
  guardian.passwordResetToken = undefined;
  guardian.passwordResetExpires = undefined;
  guardian.loginAttempts = 0;
  guardian.lockUntil = undefined;
  await guardian.save();

  req.session.flash = { success: 'Password reset successfully. Please log in.' };
  res.redirect('/auth/login');
};
