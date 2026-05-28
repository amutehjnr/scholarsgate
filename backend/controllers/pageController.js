const School = require('../models/School');
const Scholarship = require('../models/Scholarship');
const AppError = require('../utils/AppError');

// ─── Homepage ─────────────────────────────────────────────
exports.getHomepage = async (req, res) => {
  const [featuredScholarships, featuredSchools] = await Promise.all([
    Scholarship.find({ featured: true, isActive: true })
      .populate('school', 'name location images slug')
      .limit(6)
      .lean(),
    School.find({ featured: true, isActive: true })
      .limit(6)
      .lean(),
  ]);

  res.render('pages/public/home', {
    title: 'Elite USA High School Scholarships for International Students',
    featuredScholarships,
    featuredSchools,
    metaDescription: 'Discover fully funded scholarships at top USA boarding schools. ScholarsGate connects international students with elite American high school opportunities.',
  });
};

// ─── School Listings ──────────────────────────────────────
exports.getSchools = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 12;
  const skip = (page - 1) * limit;

  const query = { isActive: true };
  if (req.query.type) query.type = req.query.type;
  if (req.query.state) query['location.state'] = req.query.state;
  if (req.query.search) query.$text = { $search: req.query.search };

  const [schools, total] = await Promise.all([
    School.find(query).sort({ featured: -1, name: 1 }).skip(skip).limit(limit).lean(),
    School.countDocuments(query),
  ]);

  res.render('pages/public/schools', {
    title: 'Elite USA High Schools',
    schools,
    total,
    page,
    pages: Math.ceil(total / limit),
    filters: req.query,
  });
};

// ─── School Detail ────────────────────────────────────────
exports.getSchoolDetail = async (req, res, next) => {
  const school = await School.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!school) return next(new AppError('School not found', 404));

  const scholarships = await Scholarship.find({ school: school._id, isActive: true }).lean();
  await School.findByIdAndUpdate(school._id, { $inc: { viewCount: 1 } });

  res.render('pages/public/school-detail', {
    title: school.name,
    school,
    scholarships,
  });
};

// ─── Scholarship Listings ─────────────────────────────────
exports.getScholarships = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 12;
  const skip = (page - 1) * limit;

  const query = { isActive: true };
  if (req.query.type) query.type = req.query.type;
  if (req.query.minCoverage) query.coveragePercentage = { $gte: parseInt(req.query.minCoverage) };
  if (req.query.search) query.$text = { $search: req.query.search };
  if (req.query.grade) query['eligibility.grades'] = req.query.grade;

  const [scholarships, total] = await Promise.all([
    Scholarship.find(query)
      .populate('school', 'name location.state images.logo slug')
      .sort({ featured: -1, applicationDeadline: 1 })
      .skip(skip).limit(limit).lean(),
    Scholarship.countDocuments(query),
  ]);

  res.render('pages/public/scholarships', {
    title: 'USA High School Scholarships',
    scholarships,
    total,
    page,
    pages: Math.ceil(total / limit),
    filters: req.query,
  });
};

// ─── Scholarship Detail ───────────────────────────────────
exports.getScholarshipDetail = async (req, res, next) => {
  const scholarship = await Scholarship.findOne({ slug: req.params.slug, isActive: true })
    .populate('school').lean();
  if (!scholarship) return next(new AppError('Scholarship not found', 404));

  const relatedScholarships = await Scholarship.find({
    school: scholarship.school._id,
    _id: { $ne: scholarship._id },
    isActive: true,
  }).limit(3).populate('school', 'name location').lean();

  await Scholarship.findByIdAndUpdate(scholarship._id, { $inc: { viewCount: 1 } });

  res.render('pages/public/scholarship-detail', {
    title: scholarship.name,
    scholarship,
    relatedScholarships,
  });
};

// ─── Static Pages ─────────────────────────────────────────
exports.getAbout = (req, res) =>
  res.render('pages/public/about', { title: 'About ScholarsGate' });

exports.getContact = (req, res) =>
  res.render('pages/public/contact', { title: 'Contact Us' });

exports.getFaq = (req, res) =>
  res.render('pages/public/faq', { title: 'Frequently Asked Questions' });
