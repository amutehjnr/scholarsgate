const mongoose = require('mongoose');
const slugify = require('slugify');

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, unique: true },
  type: { type: String, enum: ['boarding', 'day', 'boarding-day', 'online'], required: true },
  category: { type: String, enum: ['private', 'charter', 'magnet', 'military', 'religious'], required: true },
  location: {
    address: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: String,
    country: { type: String, default: 'USA' },
    coordinates: { lat: Number, lng: Number },
  },
  founded: Number,
  accreditation: [String],
  affiliations: [String],
  overview: { type: String, required: true },
  mission: String,
  rankings: [{ organization: String, rank: Number, year: Number }],
  stats: {
    totalStudents: Number,
    internationalStudents: Number,
    studentTeacherRatio: String,
    avgClassSize: Number,
    graduationRate: Number,
    collegeAcceptanceRate: Number,
    satAverage: Number,
    apCourses: Number,
  },
  tuition: {
    annual: { type: Number, required: true },
    boarding: Number,
    fees: Number,
    currency: { type: String, default: 'USD' },
  },
  programs: [String],
  sports: [String],
  arts: [String],
  facilities: [String],
  images: {
    logo: String,
    hero: String,
    gallery: [{ url: String, caption: String, publicId: String }],
  },
  contactInfo: {
    email: String,
    phone: String,
    website: String,
    admissionsEmail: String,
  },
  admissionRequirements: {
    grades: [String],
    minGpa: Number,
    englishRequirements: String,
    documents: [String],
    applicationFee: Number,
    deadline: Date,
  },
  featured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  viewCount: { type: Number, default: 0 },
}, { timestamps: true });

schoolSchema.index({ slug: 1 });
schoolSchema.index({ 'location.state': 1 });
schoolSchema.index({ type: 1, category: 1 });
schoolSchema.index({ featured: 1 });
schoolSchema.index({ name: 'text', overview: 'text' });

schoolSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('School', schoolSchema);
