const Application = require('../models/Application');
const Student = require('../models/Student');
const School = require('../models/School');
const Scholarship = require('../models/Scholarship');
const { Notification, AuditLog } = require('../models/index');
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

  res.render('pages/public/apply', {
    title: `Apply — ${scholarship.name}`,
    scholarship,
    students,
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
  if (existing) return next(new AppError('You have already applied for this scholarship with this student.', 400));

  // Check deadline
  if (new Date() > scholarship.applicationDeadline) {
    return next(new AppError('Application deadline has passed.', 400));
  }

  const application = await Application.create({
    guardian: req.user._id,
    student: studentId,
    school: scholarship.school._id,
    scholarship: scholarship._id,
    personalStatement,
    whyThisSchool,
    extracurriculars,
    status: 'submitted',
    submittedAt: new Date(),
    timeline: [{ status: 'submitted', note: 'Application submitted by guardian', updatedByRole: 'guardian', timestamp: new Date() }],
  });

  // Copy student documents to application
  if (student.documents) {
    application.documents = { ...student.documents };
    await application.save();
  }

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
