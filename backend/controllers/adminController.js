const School = require('../models/School');
const Scholarship = require('../models/Scholarship');
const Application = require('../models/Application');
const Guardian = require('../models/Guardian');
const Student = require('../models/Student');
const { Offer, Payment, Notification, Admin, AuditLog } = require('../models/index');
const { uploadToCloudinary } = require('../middleware/upload');
const pdfService = require('../services/pdfService');
const { sendEmail } = require('../utils/email');
const AppError = require('../utils/AppError');

// ─── Dashboard ────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  const [
    totalGuardians, totalStudents, totalApplications, totalSchools,
    totalScholarships, pendingPayments, recentApplications, stats
  ] = await Promise.all([
    Guardian.countDocuments({ isActive: true }),
    Student.countDocuments({ isActive: true }),
    Application.countDocuments(),
    School.countDocuments({ isActive: true }),
    Scholarship.countDocuments({ isActive: true }),
    Payment.countDocuments({ status: 'pending' }),
    Application.find().populate('student', 'firstName lastName').populate('school', 'name')
      .sort({ createdAt: -1 }).limit(10).lean(),
    Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
  ]);

  const statusMap = {};
  stats.forEach(s => statusMap[s._id] = s.count);

  res.render('dashboards/admin/dashboard', {
    title: 'Admin Dashboard',
    analytics: { totalGuardians, totalStudents, totalApplications, totalSchools, totalScholarships, pendingPayments, statusMap },
    recentApplications,
  });
};

// ─── School Management ─────────────────────────────────────
exports.getSchools = async (req, res) => {
  const schools = await School.find().sort({ featured: -1, name: 1 }).lean();
  res.render('dashboards/admin/schools', { title: 'Manage Schools', schools });
};

exports.getAddSchool = (req, res) =>
  res.render('dashboards/admin/add-school', { title: 'Add School' });

exports.createSchool = async (req, res, next) => {
  const data = { ...req.body, createdBy: req.user._id };

  if (req.files?.logo?.[0]) {
    const { url } = await uploadToCloudinary(req.files.logo[0].buffer, 'schools/logos');
    data['images.logo'] = url;
  }
  if (req.files?.hero?.[0]) {
    const { url } = await uploadToCloudinary(req.files.hero[0].buffer, 'schools/hero');
    data['images.hero'] = url;
  }

  const school = await School.create(data);
  req.session.flash = { success: 'School added.' };
  res.redirect('/admin/schools');
};

exports.updateSchool = async (req, res, next) => {
  const school = await School.findById(req.params.id);
  if (!school) return next(new AppError('School not found', 404));

  Object.assign(school, req.body);
  if (req.files?.logo?.[0]) {
    const { url } = await uploadToCloudinary(req.files.logo[0].buffer, 'schools/logos');
    school.images.logo = url;
  }
  await school.save();
  req.session.flash = { success: 'School updated.' };
  res.redirect('/admin/schools');
};

exports.deleteSchool = async (req, res, next) => {
  await School.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'School deactivated.' });
};

// ─── Scholarship Management ────────────────────────────────
exports.getScholarships = async (req, res) => {
  const scholarships = await Scholarship.find().populate('school', 'name').sort({ createdAt: -1 }).lean();
  res.render('dashboards/admin/scholarships', { title: 'Manage Scholarships', scholarships });
};

exports.createScholarship = async (req, res, next) => {
  const data = { ...req.body, createdBy: req.user._id };
  await Scholarship.create(data);
  req.session.flash = { success: 'Scholarship created.' };
  res.redirect('/admin/scholarships');
};

exports.updateScholarship = async (req, res, next) => {
  await Scholarship.findByIdAndUpdate(req.params.id, req.body, { runValidators: true });
  req.session.flash = { success: 'Scholarship updated.' };
  res.redirect('/admin/scholarships');
};

// ─── Application Management ────────────────────────────────
exports.getApplications = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.school) query.school = req.query.school;

  const [applications, total, schools] = await Promise.all([
    Application.find(query)
      .populate('student', 'firstName lastName nationality')
      .populate('guardian', 'firstName lastName email')
      .populate('school', 'name')
      .populate('scholarship', 'name type')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit).limit(limit).lean(),
    Application.countDocuments(query),
    School.find({ isActive: true }, 'name').lean(),
  ]);

  res.render('dashboards/admin/applications', {
    title: 'Applications',
    applications, total, page,
    pages: Math.ceil(total / limit),
    schools, filters: req.query,
  });
};

exports.getApplicationDetail = async (req, res, next) => {
  const application = await Application.findById(req.params.id)
    .populate('student').populate('guardian').populate('school').populate('scholarship').lean();

  if (!application) return next(new AppError('Application not found', 404));

  const offer = await Offer.findOne({ application: application._id }).lean();
  const payment = offer ? await Payment.findOne({ offer: offer._id }).lean() : null;

  res.render('dashboards/admin/application-detail', {
    title: `Application #${application.applicationNumber}`,
    application, offer, payment,
  });
};

exports.updateApplicationStatus = async (req, res, next) => {
  const { status, note } = req.body;
  const application = await Application.findById(req.params.id);
  if (!application) return next(new AppError('Application not found', 404));

  application.status = status;
  application.timeline.push({ status, note, updatedBy: req.user._id, updatedByRole: req.user.role });
  await application.save();

  await Notification.create({
    recipient: application.guardian,
    recipientModel: 'Guardian',
    type: 'application_update',
    title: 'Application Status Updated',
    message: `Your application #${application.applicationNumber} status has been updated to: ${status.replace('_', ' ')}.`,
    link: `/parent/applications/${application._id}`,
  });

  await AuditLog.create({
    actor: req.user._id, actorModel: 'Admin', actorEmail: req.user.email,
    action: 'UPDATE_APPLICATION_STATUS', resource: 'Application',
    resourceId: application._id, details: { status, note },
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Status updated.' });
};

// ─── Offer Management ─────────────────────────────────────
exports.getOffers = async (req, res) => {
  const offers = await Offer.find()
    .populate('student', 'firstName lastName')
    .populate('guardian', 'firstName lastName email')
    .populate('school', 'name')
    .populate('scholarship', 'name coveragePercentage')
    .sort({ createdAt: -1 }).lean();

  res.render('dashboards/admin/offers', { title: 'Offer Management', offers });
};

exports.issueOffer = async (req, res, next) => {
  const application = await Application.findById(req.params.applicationId)
    .populate('scholarship').populate('school');

  if (!application) return next(new AppError('Application not found', 404));

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);

  const benefits = [];
  if (application.scholarship?.benefits) {
    const b = application.scholarship.benefits;
    if (b.fullTuition || b.tuition) benefits.push('Tuition Support');
    if (b.boarding) benefits.push('Boarding Accommodation');
    if (b.meals) benefits.push('Meals Included');
    if (b.satPrep) benefits.push('SAT Preparation');
    if (b.stemMentorship) benefits.push('STEM Mentorship');
    if (b.leadershipPrograms) benefits.push('Leadership Development');
    if (b.academicCounseling) benefits.push('Academic Counseling');
    if (b.collegeGuidance) benefits.push('College Guidance');
    if (b.healthInsurance) benefits.push('Health Insurance');
    if (b.custom) benefits.push(...b.custom);
  }

  const offer = await Offer.create({
    application: application._id,
    guardian: application.guardian,
    student: application.student,
    school: application.school,
    scholarship: application.scholarship,
    expiryDate,
    enrollmentDeposit: application.scholarship?.enrollmentDeposit || 500,
    scholarshipDetails: {
      type: application.scholarship?.type,
      coveragePercentage: application.scholarship?.coveragePercentage,
      annualValue: application.scholarship?.annualValue,
      benefits,
      remainingTuition: application.scholarship?.remainingTuition,
    },
    enrollmentYear: req.body.enrollmentYear,
    startDate: req.body.startDate,
    issuedBy: req.user._id,
    notes: req.body.notes,
  });

  // Generate PDF
  try {
    const pdfBuffer = await pdfService.generateOfferLetter(offer, application);
    const { url, publicId } = await uploadToCloudinary(pdfBuffer, 'offers', { resource_type: 'raw', format: 'pdf' });
    offer.pdfUrl = url;
    offer.pdfPublicId = publicId;
    await offer.save();
  } catch (err) {
    console.error('PDF generation failed:', err.message);
  }

  application.status = 'accepted';
  application.timeline.push({ status: 'accepted', note: 'Offer letter issued', updatedBy: req.user._id, updatedByRole: req.user.role });
  await application.save();

  await Notification.create({
    recipient: application.guardian,
    recipientModel: 'Guardian',
    type: 'offer_issued',
    title: '🎉 Offer Letter Issued!',
    message: `Congratulations! An offer letter has been issued for ${application.school.name}. Please review and accept within 30 days.`,
    link: `/parent/offers`,
  });

  res.json({ success: true, message: 'Offer issued successfully.' });
};

// ─── Payment Verification ──────────────────────────────────
exports.getPayments = async (req, res) => {
  const payments = await Payment.find()
    .populate('guardian', 'firstName lastName email')
    .populate({ path: 'offer', populate: { path: 'school', select: 'name' } })
    .sort({ createdAt: -1 }).lean();

  res.render('dashboards/admin/payments', { title: 'Payment Verification', payments });
};

exports.verifyPayment = async (req, res, next) => {
  const payment = await Payment.findById(req.params.id).populate('offer');
  if (!payment) return next(new AppError('Payment not found', 404));

  const { action, rejectionReason } = req.body;

  if (action === 'verify') {
    payment.status = 'verified';
    payment.verifiedAt = new Date();
    payment.verifiedBy = req.user._id;

    await Offer.findByIdAndUpdate(payment.offer._id, { status: 'confirmed' });
    await Application.findByIdAndUpdate(payment.application, { status: 'accepted' });

    await Notification.create({
      recipient: payment.guardian,
      recipientModel: 'Guardian',
      type: 'payment_verified',
      title: '✅ Enrollment Confirmed!',
      message: 'Your enrollment deposit has been verified. Your admission is now confirmed!',
      link: `/parent/offers`,
    });
  } else {
    payment.status = 'rejected';
    payment.rejectionReason = rejectionReason;

    await Notification.create({
      recipient: payment.guardian,
      recipientModel: 'Guardian',
      type: 'payment_rejected',
      title: 'Payment Proof Rejected',
      message: `Your payment proof was rejected: ${rejectionReason}. Please resubmit.`,
      link: `/parent/offers/${payment.offer._id}/payment`,
    });
  }

  await payment.save();
  res.json({ success: true, message: `Payment ${action === 'verify' ? 'verified' : 'rejected'}.` });
};

// ─── User Management ──────────────────────────────────────
exports.getUsers = async (req, res) => {
  const [guardians, admins] = await Promise.all([
    Guardian.find().sort({ createdAt: -1 }).lean(),
    Admin.find().sort({ createdAt: -1 }).lean(),
  ]);
  res.render('dashboards/admin/users', { title: 'User Management', guardians, admins });
};

exports.createAdmin = async (req, res, next) => {
  const admin = await Admin.create({ ...req.body });
  req.session.flash = { success: 'Admin user created.' };
  res.redirect('/admin/users');
};

// ─── Audit Logs ───────────────────────────────────────────
exports.getAuditLogs = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const logs = await AuditLog.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit).limit(limit).lean();
  const total = await AuditLog.countDocuments();

  res.render('dashboards/admin/audit-logs', {
    title: 'Audit Logs',
    logs, page,
    pages: Math.ceil(total / limit),
  });
};
