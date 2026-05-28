const jwt = require('jsonwebtoken');
const Guardian = require('../models/Guardian');
const { Admin } = require('../models/index');
const AppError = require('../utils/AppError');

// Verify JWT from cookie
const protect = async (req, res, next) => {
  let token;

  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    if (req.accepts('html')) {
      return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
    return next(new AppError('Not authenticated. Please log in.', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (decoded.role === 'guardian') {
      user = await Guardian.findById(decoded.id).select('-password -refreshTokens');
      if (user) user.userType = 'guardian';
    } else {
      user = await Admin.findById(decoded.id).select('-password -refreshTokens');
      if (user) user.userType = 'admin';
    }

    if (!user || !user.isActive) {
      return next(new AppError('User no longer exists or is inactive.', 401));
    }

    req.user = user;
    res.locals.user = user;
    next();
  } catch (err) {
    if (req.accepts('html')) {
      return res.redirect('/auth/login');
    }
    return next(new AppError('Invalid or expired token.', 401));
  }
};

// Redirect authenticated users
const redirectIfAuthenticated = (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'guardian') return res.redirect('/parent/dashboard');
    return res.redirect('/admin/dashboard');
  } catch {
    next();
  }
};

// Role authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Not authenticated.', 401));

    const userRole = req.user.role;
    if (!roles.includes(userRole) && !roles.includes(req.user.userType)) {
      return next(new AppError('You do not have permission to access this resource.', 403));
    }
    next();
  };
};

// Admin-only
const adminOnly = authorize('platform_admin', 'school_admin', 'admission_officer');
const platformAdminOnly = authorize('platform_admin');
const guardianOnly = authorize('guardian');

// Optional auth (doesn't block if no token)
const optionalAuth = async (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user;
    if (decoded.role === 'guardian') {
      user = await Guardian.findById(decoded.id).select('-password');
    } else {
      user = await Admin.findById(decoded.id).select('-password');
    }
    if (user) {
      req.user = user;
      res.locals.user = user;
    }
  } catch {}
  next();
};

module.exports = { protect, authorize, adminOnly, platformAdminOnly, guardianOnly, redirectIfAuthenticated, optionalAuth };
