const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  guardian: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  scholarship: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholarship' },
  applicationNumber: { type: String, unique: true },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'shortlisted', 'interview_scheduled',
           'interview_done', 'accepted', 'rejected', 'waitlisted', 'withdrawn'],
    default: 'draft',
  },
  submittedAt: Date,
  personalStatement: { type: String, maxlength: 5000 },
  extracurriculars: String,
  financialNeed: String,
  whyThisSchool: { type: String, maxlength: 2000 },
  documents: {
    transcript: { url: String, publicId: String, uploadedAt: Date },
    passport: { url: String, publicId: String, uploadedAt: Date },
    englishTest: { url: String, publicId: String, uploadedAt: Date },
    recommendationLetter: { url: String, publicId: String, uploadedAt: Date },
    personalStatement: { url: String, publicId: String, uploadedAt: Date },
    photo: { url: String, publicId: String, uploadedAt: Date },
  },
  timeline: [{
    status: String,
    note: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId },
    updatedByRole: String,
    timestamp: { type: Date, default: Date.now },
  }],
  interview: {
    scheduled: Boolean,
    date: Date,
    type: { type: String, enum: ['zoom', 'in-person', 'phone'] },
    link: String,
    notes: String,
    outcome: String,
  },
  internalNotes: [{ note: String, addedBy: mongoose.Schema.Types.ObjectId, addedAt: Date }],
  score: { type: Number, min: 0, max: 100 },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
}, { timestamps: true });

applicationSchema.index({ guardian: 1, status: 1 });
applicationSchema.index({ student: 1 });
applicationSchema.index({ school: 1, status: 1 });
applicationSchema.index({ scholarship: 1 });
applicationSchema.index({ applicationNumber: 1 });
applicationSchema.index({ submittedAt: -1 });

applicationSchema.pre('save', function (next) {
  if (!this.applicationNumber) {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.applicationNumber = `SG-${year}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Application', applicationSchema);
