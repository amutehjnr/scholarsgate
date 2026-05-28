const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const guardianSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, maxlength: 50 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, default: 'guardian', enum: ['guardian'] },
  country: { type: String, required: true },
  city: { type: String },
  timezone: { type: String, default: 'UTC' },
  avatar: { type: String, default: '' },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  refreshTokens: [{ token: String, createdAt: { type: Date, default: Date.now } }],
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  isActive: { type: Boolean, default: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    currency: { type: String, default: 'USD' },
  },
}, { timestamps: true });

guardianSchema.index({ email: 1 });
guardianSchema.index({ country: 1 });

guardianSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

guardianSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

guardianSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

guardianSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

guardianSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  return this.updateOne(updates);
};

module.exports = mongoose.model('Guardian', guardianSchema);
