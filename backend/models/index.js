const mongoose = require('mongoose');

// ─── Offer ──────────────────────────────────────────────────────────────────
const offerSchema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  guardian: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  scholarship: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholarship' },
  offerNumber: { type: String, unique: true },
  status: { type: String, enum: ['issued', 'accepted', 'declined', 'expired', 'confirmed'], default: 'issued' },
  offerDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },
  acceptanceFee: { type: Number, default: 0 },
  enrollmentDeposit: { type: Number, required: true },
  acceptanceFeeStatus: { type: String, enum: ['pending', 'paid', 'waived'], default: 'pending' },
  acceptanceFeePaidAt: Date,
  scholarshipDetails: {
    scholarshipType: String,
    coveragePercentage: Number,
    annualValue: Number,
    benefits: [String],
    remainingTuition: Number,
    acceptanceFee: Number,
  },
  enrollmentYear: String,
  startDate: Date,
  pdfUrl: String,
  pdfPublicId: String,
  acceptedAt: Date,
  declinedAt: Date,
  declineReason: String,
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  notes: String,
}, { timestamps: true });

offerSchema.pre('save', function (next) {
  if (!this.offerNumber) {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.offerNumber = `OFF-${year}-${random}`;
  }
  next();
});

offerSchema.index({ application: 1 });
offerSchema.index({ guardian: 1, status: 1 });
offerSchema.index({ offerNumber: 1 });

// ─── Payment ─────────────────────────────────────────────────────────────────
const paymentSchema = new mongoose.Schema({
  guardian: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', required: true },
  offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  paymentType: {
    type: String,
    enum: ['acceptance_fee', 'enrollment_deposit'],
    default: 'enrollment_deposit',
  },
  paymentMethod: {
    type: String,
    enum: [
      'wire_transfer',
      'bank_transfer',
      'western_union',
      'paypal',
      'crypto_usdt',
      'crypto_btc',
      'crypto_eth',
      'other',
    ],
  },
  referenceNumber: String,

  // ── Crypto-specific fields ────────────────────────────────────────────────
  cryptoTxHash: String,        // on-chain transaction hash
  cryptoWalletAddress: String, // sender wallet address
  cryptoNetwork: String,       // e.g. TRC20, ERC20, BEP20, Mainnet

  proofOfPayment: { url: String, publicId: String },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'verified', 'rejected'],
    default: 'pending',
  },
  submittedAt: { type: Date, default: Date.now },
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  rejectionReason: String,
  notes: String,
}, { timestamps: true });

paymentSchema.index({ guardian: 1, status: 1 });
paymentSchema.index({ offer: 1 });
paymentSchema.index({ status: 1 });

// ─── Notification ─────────────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, required: true },
  recipientModel: { type: String, enum: ['Guardian', 'Admin'], required: true },
  type: {
    type: String,
    enum: [
      'application_submitted', 'application_update', 'offer_issued', 'offer_expiring',
      'payment_submitted', 'payment_verified', 'payment_rejected', 'interview_scheduled',
      'document_required', 'deadline_reminder', 'welcome', 'system',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: String,
  isRead: { type: Boolean, default: false },
  readAt: Date,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

// ─── Admin ────────────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['platform_admin', 'school_admin', 'admission_officer'], required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  permissions: [String],
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  refreshTokens: [{ token: String, createdAt: Date }],
  avatar: String,
}, { timestamps: true });

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

adminSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ─── AuditLog ─────────────────────────────────────────────────────────────────
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, required: true },
  actorModel: { type: String, enum: ['Guardian', 'Admin'], required: true },
  actorEmail: String,
  action: { type: String, required: true },
  resource: String,
  resourceId: mongoose.Schema.Types.ObjectId,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  status: { type: String, enum: ['success', 'failure'], default: 'success' },
}, { timestamps: true });

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

// ─── BankDetails ──────────────────────────────────────────────────────────────
const bankDetailsSchema = new mongoose.Schema({
  // ── Traditional bank ──────────────────────────────────────────────────────
  accountName: { type: String, required: true },
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  routingNumber: { type: String },
  swiftCode: { type: String },
  iban: { type: String },
  paypalEmail: { type: String },
  currency: { type: String, default: 'USD' },
  instructions: { type: String },

  // ── Crypto wallets ────────────────────────────────────────────────────────
  cryptoEnabled: { type: Boolean, default: false },
  cryptoAddresses: {
    usdtTrc20:  { type: String, default: '' },  // USDT on TRON  (TRC20)
    usdtErc20:  { type: String, default: '' },  // USDT on ETH   (ERC20)
    usdtBep20:  { type: String, default: '' },  // USDT on BNB   (BEP20)
    bitcoin:    { type: String, default: '' },  // BTC
    ethereum:   { type: String, default: '' },  // ETH
  },
  cryptoInstructions: { type: String, default: '' },

  isActive: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = {
  Offer:       mongoose.model('Offer', offerSchema),
  Payment:     mongoose.model('Payment', paymentSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Admin:       mongoose.model('Admin', adminSchema),
  AuditLog:    mongoose.model('AuditLog', auditLogSchema),
  BankDetails: mongoose.model('BankDetails', bankDetailsSchema),
};
