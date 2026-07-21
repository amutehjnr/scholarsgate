require('dotenv').config();
require('express-async-errors');

const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');

const connectDB = require('./backend/config/database');
const logger = require('./backend/utils/logger');
const errorHandler = require('./backend/middleware/errorHandler');
const { rateLimiter } = require('./backend/middleware/rateLimiter');

// Route imports
const authRoutes = require('./backend/routes/authRoutes');
const parentRoutes = require('./backend/routes/parentRoutes');
const studentRoutes = require('./backend/routes/studentRoutes');
const schoolRoutes = require('./backend/routes/schoolRoutes');
const scholarshipRoutes = require('./backend/routes/scholarshipRoutes');
const applicationRoutes = require('./backend/routes/applicationRoutes');
const offerRoutes = require('./backend/routes/offerRoutes');
const paymentRoutes = require('./backend/routes/paymentRoutes');
const adminRoutes = require('./backend/routes/adminRoutes');
const notificationRoutes = require('./backend/routes/notificationRoutes');
const pageRoutes = require('./backend/routes/pageRoutes');
const emailCampaignRoutes = require('./backend/routes/emailCampaignRoutes');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'frontend/views'));

// Trust proxy (for Render deployment)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com', 'cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'res.cloudinary.com', '*.cloudinary.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({ origin: process.env.APP_URL, credentials: true }));

// Compression
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: 'strict',
  },
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api/', rateLimiter);

// Static files
app.use(express.static(path.join(__dirname, 'frontend/public')));

// Global template variables middleware
app.use((req, res, next) => {
  res.locals.appName = process.env.APP_NAME || 'ScholarsGate';
  res.locals.appUrl = process.env.APP_URL || '';
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;
  next();
});

// Routes
app.use('/', pageRoutes);
app.use('/auth', authRoutes);
app.use('/parent', parentRoutes);
app.use('/student', studentRoutes);
app.use('/schools', schoolRoutes);
app.use('/scholarships', scholarshipRoutes);
app.use('/applications', applicationRoutes);
app.use('/offers', offerRoutes);
app.use('/payments', paymentRoutes);
app.use('/admin/email-campaigns', emailCampaignRoutes);
app.use('/admin', adminRoutes);
app.use('/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/public/404', { title: 'Page Not Found' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`ScholarsGate server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = { app, server };
