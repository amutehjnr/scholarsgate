const Application = require('../models/Application');
const Student = require('../models/Student');
const School = require('../models/School');
const Scholarship = require('../models/Scholarship');
const { Notification, AuditLog, Payment, BankDetails } = require('../models/index');
const { uploadToCloudinary } = require('../middleware/upload');
const AppError = require('../utils/AppError');

exports.getApplyPage = async (req, res, next) => {
  const scholarship = await Scholarship.findOne({ slug: req.params.scholarshipSlug, isActive: true })
    .populate('school').lean();

  if (!scholarship) return next(new AppError('Scholarship not found', 404));

  const students = await Student.find({ guardian: req.user._id, isActive: true }).lean();

  if (students.length === 0) {
    req.session.flash = { warning: 'Please add a student profile before applying.' };
    return res.redirect('/parent/students/add');
  }

  const bankDetails = scholarship.applicationFee > 0
    ? await BankDetails.findOne({ isActive: true }).lean()
    : null;

  res.render('pages/public/apply', {
    title: `Apply — ${scholarship.name}`,
    scholarship,
    students,
    bankDetails,
  });
};

exports.submitApplication = async (req, res, next) => {
  const { studentId, personalStatement, whyThisSchool, extracurriculars } = req.body;
  const { scholarshipSlug } = req.params;

  const [scholarship, student] = await Promise.all([
    Scholarship.findOne({ slug: scholarshipSlug, isActive: true }).populate('school'),
    Student.findOne({ _id: studentId, guardian: req.user._id }),
  ]);

  if (!scholarship) return next(new AppError('Scholarship not found', 404));
  if (!student) return next(new AppError('Student not found', 404));

  // Check duplicate
  const existing = await Application.findOne({
    guardian: req.user._id,
    student: studentId,
    school: scholarship.school._id,
    scholarship: scholarship._id,
  });
  if (existing) {
    // Already started but stuck behind an unpaid application fee — send them
    // back to finish that instead of blocking them outright.
    if (existing.status === 'draft' && existing.applicationFeeStatus === 'pending') {
      req.session.flash = { warning: 'You already started this application. Check its status or resubmit your application fee payment.' };
      return res.redirect(`/parent/applications/${existing._id}`);
    }
    return next(new AppError('You have already applied for this scholarship with this student.', 400));
  }

  // Check deadline
  if (new Date() > scholarship.applicationDeadline) {
    return next(new AppError('Application deadline has passed.', 400));
  }

  const applicationFee = Number(scholarship.applicationFee) || 0;
  const requiresFee = applicationFee > 0;

  // When a fee applies, payment proof is required up front, right here in
  // the apply form — not as a separate step afterward.
  if (requiresFee) {
    if (!req.body.paymentMethod) return next(new AppError('Please select a payment method for the application fee.', 400));
    if (!req.file) return next(new AppError('Please upload proof of payment for the application fee.', 400));
  }

  const application = await Application.create({
    guardian: req.user._id,
    student: studentId,
    school: scholarship.school._id,
    scholarship: scholarship._id,
    personalStatement,
    whyThisSchool,
    extracurriculars,
    applicationFeeAmount: applicationFee,
    applicationFeeStatus: requiresFee ? 'pending' : 'not_required',
    // A fee-gated application stays a draft — not visible to admins as
    // "submitted" — until the fee is paid and verified.
    status: requiresFee ? 'draft' : 'submitted',
    submittedAt: requiresFee ? undefined : new Date(),
    timeline: requiresFee ? [] : [{ status: 'submitted', note: 'Application submitted by guardian', updatedByRole: 'guardian', timestamp: new Date() }],
  });

  // Copy student documents to application
  if (student.documents) {
    application.documents = { ...student.documents };
    await application.save();
  }

  if (requiresFee) {
    const { url, publicId } = await uploadToCloudinary(req.file.buffer, 'payments');
    const isCrypto = (req.body.paymentMethod || '').startsWith('crypto_');

    await Payment.create({
      guardian: req.user._id,
      application: application._id,
      amount: applicationFee,
      paymentMethod: req.body.paymentMethod,
      referenceNumber: req.body.referenceNumber || null,
      proofOfPayment: { url, publicId },
      paymentType: 'application_fee',
      status: 'pending',
      ...(isCrypto && {
        cryptoTxHash:        req.body.cryptoTxHash        || null,
        cryptoWalletAddress: req.body.cryptoWalletAddress || null,
        cryptoNetwork:       req.body.cryptoNetwork       || null,
      }),
    });

    await Notification.create({
      recipient: req.user._id,
      recipientModel: 'Guardian',
      type: 'payment_submitted',
      title: 'Application Fee Submitted',
      message: `Your application fee payment for ${scholarship.name} at ${scholarship.school.name} is under review. You'll be notified once it's verified and your application is submitted.`,
      link: `/parent/applications/${application._id}`,
    });

    await AuditLog.create({
      actor: req.user._id, actorModel: 'Guardian', actorEmail: req.user.email,
      action: 'START_APPLICATION', resource: 'Application', resourceId: application._id,
      ipAddress: req.ip,
    });

    req.session.flash = { success: `Application fee submitted! Your application will be reviewed once payment is verified (24–48 hrs). Reference: ${application.applicationNumber}` };
    return res.redirect(`/parent/applications/${application._id}`);
  }

  // No fee required — submit immediately, exactly as before.
  await Scholarship.findByIdAndUpdate(scholarship._id, { $inc: { applicationCount: 1 } });

  await Notification.create({
    recipient: req.user._id,
    recipientModel: 'Guardian',
    type: 'application_submitted',
    title: 'Application Submitted',
    message: `Your application for ${scholarship.name} at ${scholarship.school.name} has been submitted successfully.`,
    link: `/parent/applications/${application._id}`,
  });

  await AuditLog.create({
    actor: req.user._id, actorModel: 'Guardian', actorEmail: req.user.email,
    action: 'SUBMIT_APPLICATION', resource: 'Application', resourceId: application._id,
    ipAddress: req.ip,
  });

  req.session.flash = { success: `Application submitted! Reference: ${application.applicationNumber}` };
  res.redirect(`/parent/applications/${application._id}`);
};