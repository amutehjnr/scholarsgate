const Student = require('../models/Student');
const Application = require('../models/Application');
const { Offer, Payment, Notification } = require('../models/index');
const { uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');
const AppError = require('../utils/AppError');
const pdfService = require('../services/pdfService');

// ─── Dashboard Home ───────────────────────────────────────
exports.getDashboard = async (req, res) => {
  const guardianId = req.user._id;

  const [students, applications, offers, unreadNotifs] = await Promise.all([
    Student.find({ guardian: guardianId, isActive: true }).lean(),
    Application.find({ guardian: guardianId })
      .populate('school', 'name location images.logo')
      .populate('scholarship', 'name type coveragePercentage')
      .sort({ updatedAt: -1 }).limit(5).lean(),
    Offer.find({ guardian: guardianId })
      .populate('school', 'name')
      .populate('scholarship', 'name')
      .sort({ createdAt: -1 }).lean(),
    Notification.countDocuments({ recipient: guardianId, isRead: false }),
  ]);

  const stats = {
    students: students.length,
    applications: applications.length,
    pending: applications.filter(a => ['submitted', 'under_review'].includes(a.status)).length,
    offers: offers.filter(o => o.status === 'issued').length,
  };

  res.render('dashboards/parent/dashboard', {
    title: 'Parent Dashboard',
    students,
    recentApplications: applications,
    offers,
    stats,
    unreadNotifs,
  });
};

// ─── Students ─────────────────────────────────────────────
exports.getStudents = async (req, res) => {
  const students = await Student.find({ guardian: req.user._id, isActive: true }).lean();
  res.render('dashboards/parent/students', { title: 'My Students', students });
};

exports.getAddStudent = (req, res) =>
  res.render('dashboards/parent/add-student', { title: 'Add Student Profile' });

exports.addStudent = async (req, res, next) => {
  const data = { ...req.body, guardian: req.user._id };

  if (req.file) {
    const { url, publicId } = await uploadToCloudinary(req.file.buffer, 'students/photos');
    data['documents.photo'] = { url, publicId, uploadedAt: new Date() };
    data.avatar = url;
  }

  const student = await Student.create(data);
  student.calculateProfileCompletion();
  await student.save();

  await req.user.updateOne({ $push: { students: student._id } });

  req.session.flash = { success: 'Student profile created successfully.' };
  res.redirect(`/parent/students/${student._id}`);
};

exports.getStudent = async (req, res, next) => {
  const student = await Student.findOne({ _id: req.params.id, guardian: req.user._id }).lean();
  if (!student) return next(new AppError('Student not found', 404));

  const applications = await Application.find({ student: student._id })
    .populate('school', 'name location').populate('scholarship', 'name').lean();

  res.render('dashboards/parent/student-profile', {
    title: `${student.firstName} ${student.lastName}`,
    student,
    applications,
  });
};

exports.updateStudent = async (req, res, next) => {
  const student = await Student.findOne({ _id: req.params.id, guardian: req.user._id });
  if (!student) return next(new AppError('Student not found', 404));

  Object.assign(student, req.body);

  if (req.file) {
    if (student.documents?.photo?.publicId) {
      await deleteFromCloudinary(student.documents.photo.publicId);
    }
    const { url, publicId } = await uploadToCloudinary(req.file.buffer, 'students/photos');
    student.documents.photo = { url, publicId, uploadedAt: new Date() };
    student.avatar = url;
  }

  student.calculateProfileCompletion();
  await student.save();

  req.session.flash = { success: 'Profile updated.' };
  res.redirect(`/parent/students/${student._id}`);
};

// ─── Document Upload ─────────────────────────────────────
exports.uploadDocument = async (req, res, next) => {
  const { studentId, docType } = req.params;
  const student = await Student.findOne({ _id: studentId, guardian: req.user._id });
  if (!student) return next(new AppError('Student not found', 404));

  if (!req.file) return next(new AppError('No file uploaded', 400));

  const validDocTypes = ['transcript', 'passport', 'englishTest', 'recommendationLetter', 'personalStatement'];
  if (!validDocTypes.includes(docType)) return next(new AppError('Invalid document type', 400));

  if (student.documents?.[docType]?.publicId) {
    await deleteFromCloudinary(student.documents[docType].publicId);
  }

  const { url, publicId } = await uploadToCloudinary(req.file.buffer, `students/documents`);
  student.documents[docType] = { url, publicId, uploadedAt: new Date() };
  student.calculateProfileCompletion();
  await student.save();

  res.json({ success: true, url, message: 'Document uploaded successfully' });
};

// ─── Applications ─────────────────────────────────────────
exports.getApplications = async (req, res) => {
  const applications = await Application.find({ guardian: req.user._id })
    .populate('student', 'firstName lastName avatar')
    .populate('school', 'name location images.logo slug')
    .populate('scholarship', 'name type coveragePercentage')
    .sort({ updatedAt: -1 }).lean();

  res.render('dashboards/parent/applications', { title: 'Applications', applications });
};

exports.getApplicationDetail = async (req, res, next) => {
  const application = await Application.findOne({ _id: req.params.id, guardian: req.user._id })
    .populate('student').populate('school').populate('scholarship').lean();

  if (!application) return next(new AppError('Application not found', 404));

  const offer = await Offer.findOne({ application: application._id }).lean();
  const payment = offer ? await Payment.findOne({ offer: offer._id }).lean() : null;

  res.render('dashboards/parent/application-detail', {
    title: `Application #${application.applicationNumber}`,
    application,
    offer,
    payment,
  });
};

// ─── Offers ───────────────────────────────────────────────
exports.getOffers = async (req, res) => {
  const offers = await Offer.find({ guardian: req.user._id })
    .populate('school', 'name location images.logo')
    .populate('scholarship', 'name coveragePercentage type')
    .populate('student', 'firstName lastName avatar')
    .sort({ createdAt: -1 }).lean();

  res.render('dashboards/parent/offers', { title: 'Offer Letters', offers });
};

exports.acceptOffer = async (req, res, next) => {
  const offer = await Offer.findOne({ _id: req.params.id, guardian: req.user._id });
  if (!offer) return next(new AppError('Offer not found', 404));
  if (offer.status !== 'issued') return next(new AppError('Offer cannot be accepted in its current state', 400));
  if (new Date() > offer.expiryDate) return next(new AppError('Offer has expired', 400));

  offer.status = 'accepted';
  offer.acceptedAt = new Date();
  await offer.save();

  await Application.findByIdAndUpdate(offer.application, { status: 'accepted' });

  req.session.flash = { success: 'Offer accepted! Please proceed with enrollment deposit.' };
  res.redirect(`/parent/offers/${offer._id}/payment`);
};

// ─── Payment Upload ───────────────────────────────────────
exports.getPaymentPage = async (req, res, next) => {
  const offer = await Offer.findOne({ _id: req.params.id, guardian: req.user._id })
    .populate('school', 'name').populate('scholarship', 'name').lean();

  if (!offer) return next(new AppError('Offer not found', 404));

  const existingPayment = await Payment.findOne({ offer: offer._id }).lean();

  res.render('dashboards/parent/payment-upload', {
    title: 'Submit Enrollment Deposit',
    offer,
    existingPayment,
  });
};

exports.submitPayment = async (req, res, next) => {
  const offer = await Offer.findOne({ _id: req.params.offerId, guardian: req.user._id });
  if (!offer) return next(new AppError('Offer not found', 404));

  if (!req.file) return next(new AppError('Proof of payment is required', 400));

  const existing = await Payment.findOne({ offer: offer._id });
  if (existing && existing.status === 'verified') {
    return next(new AppError('Payment already verified', 400));
  }

  const { url, publicId } = await uploadToCloudinary(req.file.buffer, 'payments');

  const paymentData = {
    guardian: req.user._id,
    offer: offer._id,
    application: offer.application,
    amount: offer.enrollmentDeposit,
    paymentMethod: req.body.paymentMethod,
    referenceNumber: req.body.referenceNumber,
    proofOfPayment: { url, publicId },
    status: 'pending',
  };

  if (existing) {
    Object.assign(existing, paymentData);
    await existing.save();
  } else {
    await Payment.create(paymentData);
  }

  await Notification.create({
    recipient: offer.guardian,
    recipientModel: 'Guardian',
    type: 'payment_submitted',
    title: 'Payment Proof Submitted',
    message: 'Your enrollment deposit proof has been submitted and is under review.',
    link: `/parent/offers/${offer._id}/payment`,
  });

  req.session.flash = { success: 'Payment proof submitted. Admin will verify within 24-48 hours.' };
  res.redirect('/parent/applications');
};

// ─── Notifications ────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 }).limit(50).lean();

  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.render('dashboards/parent/notifications', { title: 'Notifications', notifications });
};

// ─── Settings ─────────────────────────────────────────────
exports.getSettings = (req, res) =>
  res.render('dashboards/parent/settings', { title: 'Account Settings' });

exports.updateSettings = async (req, res, next) => {
  const { firstName, lastName, phone, country, city } = req.body;

  if (req.file) {
    const { url } = await uploadToCloudinary(req.file.buffer, 'guardians/avatars');
    await req.user.updateOne({ avatar: url });
  }

  await req.user.updateOne({ firstName, lastName, phone, country, city });
  req.session.flash = { success: 'Profile updated.' };
  res.redirect('/parent/settings');
};
