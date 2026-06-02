const mongoose = require('mongoose');
const slugify = require('slugify');

const scholarshipSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String },
  type: {
    type: String,
    enum: ['full', 'partial', 'merit', 'boarding', 'stem', 'arts', 'athletic', 'need-based'],
    required: true,
  },
  coveragePercentage: { type: Number, min: 1, max: 100, required: true },
  annualValue: { type: Number, required: true },
  totalValue: Number,
  duration: { years: Number, renewable: Boolean, renewalCriteria: String },
  benefits: {
    tuition: { type: Boolean, default: false },
    fullTuition: { type: Boolean, default: false },
    boarding: { type: Boolean, default: false },
    meals: { type: Boolean, default: false },
    books: { type: Boolean, default: false },
    uniform: { type: Boolean, default: false },
    healthInsurance: { type: Boolean, default: false },
    airfare: { type: Boolean, default: false },
    satPrep: { type: Boolean, default: false },
    mentorship: { type: Boolean, default: false },
    internship: { type: Boolean, default: false },
    collegeGuidance: { type: Boolean, default: false },
    leadershipPrograms: { type: Boolean, default: false },
    stemMentorship: { type: Boolean, default: false },
    academicCounseling: { type: Boolean, default: false },
    custom: [String],
  },
  remainingTuition: Number,
  acceptanceFee: { type: Number, default: 0 },
  enrollmentDeposit: { type: Number, default: 500 },
  eligibility: {
    grades: [String],
    minGpa: Number,
    minSatScore: Number,
    nationalities: [String],
    excludedNationalities: [String],
    ageMin: Number,
    ageMax: Number,
    englishProficiency: String,
    other: [String],
  },
  applicationDeadline: { type: Date, required: true },
  startDate: Date,
  applicationRequirements: [String],
  selectionCriteria: [String],
  description: { type: String, required: true },
  highlights: [String],
  slotsTotal: Number,
  slotsFilled: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  viewCount: { type: Number, default: 0 },
  applicationCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

scholarshipSchema.index({ school: 1 });
scholarshipSchema.index({ type: 1 });
scholarshipSchema.index({ featured: 1 });
scholarshipSchema.index({ applicationDeadline: 1 });
scholarshipSchema.index({ coveragePercentage: 1 });
scholarshipSchema.index({ name: 'text', description: 'text' });

scholarshipSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

scholarshipSchema.virtual('slotsRemaining').get(function () {
  if (!this.slotsTotal) return null;
  return Math.max(0, this.slotsTotal - this.slotsFilled);
});

scholarshipSchema.virtual('isClosed').get(function () {
  return new Date() > this.applicationDeadline;
});

module.exports = mongoose.model('Scholarship', scholarshipSchema);
