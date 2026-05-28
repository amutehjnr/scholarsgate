const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  guardian: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  nationality: { type: String, required: true },
  passportNumber: { type: String, trim: true },
  passportExpiry: Date,
  currentSchool: { type: String, trim: true },
  currentGrade: { type: String, trim: true },
  gpa: { type: Number, min: 0, max: 4.0 },
  intendedGrade: { type: String, required: true },
  intendedYear: { type: Number, required: true },
  languageOfInstruction: { type: String, default: 'English' },
  englishProficiency: {
    test: { type: String, enum: ['TOEFL', 'IELTS', 'Duolingo', 'None', 'Native'] },
    score: Number,
    date: Date,
  },
  satScore: { total: Number, math: Number, reading: Number, date: Date },
  achievements: [{ title: String, year: Number, description: String }],
  extracurriculars: [{ activity: String, role: String, years: Number }],
  documents: {
    transcript: { url: String, publicId: String, uploadedAt: Date },
    passport: { url: String, publicId: String, uploadedAt: Date },
    englishTest: { url: String, publicId: String, uploadedAt: Date },
    recommendationLetter: { url: String, publicId: String, uploadedAt: Date },
    personalStatement: { url: String, publicId: String, uploadedAt: Date },
    photo: { url: String, publicId: String, uploadedAt: Date },
  },
  interests: [String],
  careerGoals: String,
  avatar: String,
  profileCompletion: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

studentSchema.index({ guardian: 1 });
studentSchema.index({ nationality: 1 });
studentSchema.index({ intendedGrade: 1 });

studentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

studentSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - this.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
});

studentSchema.methods.calculateProfileCompletion = function () {
  const fields = [
    this.firstName, this.lastName, this.dateOfBirth, this.gender, this.nationality,
    this.currentSchool, this.currentGrade, this.gpa, this.intendedGrade,
    this.documents?.transcript?.url, this.documents?.photo?.url,
  ];
  const filled = fields.filter(Boolean).length;
  this.profileCompletion = Math.round((filled / fields.length) * 100);
  return this.profileCompletion;
};

module.exports = mongoose.model('Student', studentSchema);
