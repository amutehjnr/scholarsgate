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
  req.session.flash = { success: 'School added successfully.' };
  res.redirect('/admin/schools');
};

exports.getEditSchool = async (req, res, next) => {
  const school = await School.findById(req.params.id).lean();
  if (!school) return next(new AppError('School not found', 404));
  res.render('dashboards/admin/edit-school', { title: `Edit — ${school.name}`, school });
};

exports.updateSchool = async (req, res, next) => {
  const school = await School.findById(req.params.id);
  if (!school) return next(new AppError('School not found', 404));

  // Handle nested fields from form
  const body = req.body;

  // Basic fields
  school.name         = body.name || school.name;
  school.type         = body.type || school.type;
  school.category     = body.category || school.category;
  school.overview     = body.overview || school.overview;
  school.mission      = body.mission || school.mission;
  school.founded      = body.founded || school.founded;
  school.featured     = body.featured === 'true' || body.featured === 'on';
  school.isActive     = body.isActive !== 'false';

  // Location
  if (body['location[city]'])    school.location.city    = body['location[city]'];
  if (body['location[state]'])   school.location.state   = body['location[state]'];
  if (body['location[zipCode]']) school.location.zipCode = body['location[zipCode]'];
  if (body['location[address]']) school.location.address = body['location[address]'];

  // Tuition & Fees
  if (body['tuition[annual]'])   school.tuition.annual   = Number(body['tuition[annual]']);
  if (body['tuition[boarding]']) school.tuition.boarding = Number(body['tuition[boarding]']);
  if (body['tuition[fees]'])     school.tuition.fees     = Number(body['tuition[fees]']);

  // Stats
  if (body['stats[totalStudents]'])        school.stats.totalStudents        = Number(body['stats[totalStudents]']);
  if (body['stats[internationalStudents]']) school.stats.internationalStudents = Number(body['stats[internationalStudents]']);
  if (body['stats[studentTeacherRatio]'])  school.stats.studentTeacherRatio  = body['stats[studentTeacherRatio]'];
  if (body['stats[collegeAcceptanceRate]']) school.stats.collegeAcceptanceRate = Number(body['stats[collegeAcceptanceRate]']);
  if (body['stats[satAverage]'])           school.stats.satAverage           = Number(body['stats[satAverage]']);
  if (body['stats[apCourses]'])            school.stats.apCourses            = Number(body['stats[apCourses]']);

  // Contact
  if (body['contactInfo[email]'])          school.contactInfo.email          = body['contactInfo[email]'];
  if (body['contactInfo[phone]'])          school.contactInfo.phone          = body['contactInfo[phone]'];
  if (body['contactInfo[website]'])        school.contactInfo.website        = body['contactInfo[website]'];
  if (body['contactInfo[admissionsEmail]']) school.contactInfo.admissionsEmail = body['contactInfo[admissionsEmail]'];

  // Image uploads
  if (req.files?.logo?.[0]) {
    const { url } = await uploadToCloudinary(req.files.logo[0].buffer, 'schools/logos');
    school.images.logo = url;
  }
  if (req.files?.hero?.[0]) {
    const { url } = await uploadToCloudinary(req.files.hero[0].buffer, 'schools/hero');
    school.images.hero = url;
  }

  await school.save();

  await AuditLog.create({
    actor: req.user._id, actorModel: 'Admin', actorEmail: req.user.email,
    action: 'UPDATE_SCHOOL', resource: 'School', resourceId: school._id,
    ipAddress: req.ip,
  });

  req.session.flash = { success: `${school.name} updated successfully.` };
  res.redirect('/admin/schools');
};

exports.deleteSchool = async (req, res, next) => {
  await School.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'School deactivated.' });
};

// ─── Scholarship Management ────────────────────────────────
exports.getScholarships = async (req, res) => {
  const [scholarships, schools] = await Promise.all([
    Scholarship.find().populate('school', 'name').sort({ createdAt: -1 }).lean(),
    School.find({ isActive: true }, 'name').lean(),
  ]);
  res.render('dashboards/admin/scholarships', { title: 'Manage Scholarships', scholarships, schools });
};

exports.createScholarship = async (req, res, next) => {
  const data = { ...req.body, createdBy: req.user._id };
  await Scholarship.create(data);
  req.session.flash = { success: 'Scholarship created.' };
  res.redirect('/admin/scholarships');
};

exports.getEditScholarship = async (req, res, next) => {
  const [scholarship, schools] = await Promise.all([
    Scholarship.findById(req.params.id).populate('school', 'name').lean(),
    School.find({ isActive: true }, 'name').lean(),
  ]);
  if (!scholarship) return next(new AppError('Scholarship not found', 404));
  res.render('dashboards/admin/edit-scholarship', {
    title: `Edit — ${scholarship.name}`,
    scholarship,
    schools,
  });
};

exports.updateScholarship = async (req, res, next) => {
  const scholarship = await Scholarship.findById(req.params.id);
  if (!scholarship) return next(new AppError('Scholarship not found', 404));

  const body = req.body;

  // Core fields
  if (body.name)               scholarship.name               = body.name;
  if (body.school)             scholarship.school             = body.school;
  if (body.type)               scholarship.type               = body.type;
  if (body.coveragePercentage) scholarship.coveragePercentage = Number(body.coveragePercentage);
  if (body.annualValue)        scholarship.annualValue        = Number(body.annualValue);
  if (body.totalValue)         scholarship.totalValue         = Number(body.totalValue);
  if (body.description)        scholarship.description        = body.description;
  if (body.applicationDeadline) scholarship.applicationDeadline = new Date(body.applicationDeadline);
  if (body.slotsTotal)         scholarship.slotsTotal         = Number(body.slotsTotal);
  if (body.remainingTuition !== undefined) scholarship.remainingTuition = Number(body.remainingTuition);

  // FEES — enrollment deposit & remaining tuition
  if (body.enrollmentDeposit !== undefined) scholarship.enrollmentDeposit = Number(body.enrollmentDeposit);

  // Duration
  if (body['duration[years]'])    scholarship.duration.years    = Number(body['duration[years]']);
  if (body['duration[renewable]']) scholarship.duration.renewable = body['duration[renewable]'] === 'true';
  if (body['duration[renewalCriteria]']) scholarship.duration.renewalCriteria = body['duration[renewalCriteria]'];

  // Eligibility
  if (body['eligibility[minGpa]'])     scholarship.eligibility.minGpa     = Number(body['eligibility[minGpa]']);
  if (body['eligibility[ageMin]'])     scholarship.eligibility.ageMin     = Number(body['eligibility[ageMin]']);
  if (body['eligibility[ageMax]'])     scholarship.eligibility.ageMax     = Number(body['eligibility[ageMax]']);
  if (body['eligibility[grades]'])     scholarship.eligibility.grades     = Array.isArray(body['eligibility[grades]']) ? body['eligibility[grades]'] : [body['eligibility[grades]']];
  if (body['eligibility[englishProficiency]']) scholarship.eligibility.englishProficiency = body['eligibility[englishProficiency]'];

  // Benefits
  scholarship.benefits = {
    fullTuition:        body['benefits[fullTuition]']        === 'true' || body['benefits[fullTuition]']        === 'on',
    tuition:            body['benefits[tuition]']            === 'true' || body['benefits[tuition]']            === 'on',
    boarding:           body['benefits[boarding]']           === 'true' || body['benefits[boarding]']           === 'on',
    meals:              body['benefits[meals]']              === 'true' || body['benefits[meals]']              === 'on',
    books:              body['benefits[books]']              === 'true' || body['benefits[books]']              === 'on',
    uniform:            body['benefits[uniform]']            === 'true' || body['benefits[uniform]']            === 'on',
    healthInsurance:    body['benefits[healthInsurance]']    === 'true' || body['benefits[healthInsurance]']    === 'on',
    airfare:            body['benefits[airfare]']            === 'true' || body['benefits[airfare]']            === 'on',
    satPrep:            body['benefits[satPrep]']            === 'true' || body['benefits[satPrep]']            === 'on',
    mentorship:         body['benefits[mentorship]']         === 'true' || body['benefits[mentorship]']         === 'on',
    internship:         body['benefits[internship]']         === 'true' || body['benefits[internship]']         === 'on',
    collegeGuidance:    body['benefits[collegeGuidance]']    === 'true' || body['benefits[collegeGuidance]']    === 'on',
    leadershipPrograms: body['benefits[leadershipPrograms]'] === 'true' || body['benefits[leadershipPrograms]'] === 'on',
    stemMentorship:     body['benefits[stemMentorship]']     === 'true' || body['benefits[stemMentorship]']     === 'on',
    academicCounseling: body['benefits[academicCounseling]'] === 'true' || body['benefits[academicCounseling]'] === 'on',
  };

  scholarship.featured = body.featured === 'true' || body.featured === 'on';
  scholarship.isActive = body.isActive !== 'false';

  await scholarship.save();

  await AuditLog.create({
    actor: req.user._id, actorModel: 'Admin', actorEmail: req.user.email,
    action: 'UPDATE_SCHOLARSHIP', resource: 'Scholarship', resourceId: scholarship._id,
    ipAddress: req.ip,
  });

  req.session.flash = { success: `${scholarship.name} updated successfully.` };
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
  await Admin.create({ ...req.body });
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

// ─── Bank Details ─────────────────────────────────────────
const { BankDetails } = require('../models/index');

exports.getBankDetails = async (req, res) => {
  const bankDetails = await BankDetails.findOne({ isActive: true }).lean();
  res.render('dashboards/admin/bank-details', { title: 'Bank Account Details', bankDetails });
};

exports.saveBankDetails = async (req, res, next) => {
  const { accountName, bankName, accountNumber, routingNumber, swiftCode, iban, paypalEmail, currency, instructions } = req.body;
  const existing = await BankDetails.findOne({ isActive: true });

  if (existing) {
    Object.assign(existing, { accountName, bankName, accountNumber, routingNumber, swiftCode, iban, paypalEmail, currency, instructions, updatedBy: req.user._id });
    await existing.save();
  } else {
    await BankDetails.create({ accountName, bankName, accountNumber, routingNumber, swiftCode, iban, paypalEmail, currency, instructions, updatedBy: req.user._id });
  }

  await AuditLog.create({
    actor: req.user._id, actorModel: 'Admin', actorEmail: req.user.email,
    action: 'UPDATE_BANK_DETAILS', resource: 'BankDetails', ipAddress: req.ip,
  });

  req.session.flash = { success: 'Bank details updated successfully.' };
  res.redirect('/admin/bank-details');
};