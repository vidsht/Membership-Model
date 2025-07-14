const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  businesses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  }],
  paymentInfo: {
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    bankName: { type: String, trim: true },
    bankBranch: { type: String, trim: true }
  },
  merchantType: {
    type: String,
    enum: ['individual', 'company'],
    default: 'individual'
  },
  taxDocuments: [{
    name: { type: String },
    documentUrl: { type: String }
  }],
  verificationStatus: {
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  commissionRate: {
    type: Number,
    default: 0
  },
  contractDetails: {
    startDate: { type: Date },
    endDate: { type: Date },
    documentUrl: { type: String }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Merchant', merchantSchema);
