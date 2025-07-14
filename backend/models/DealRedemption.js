const mongoose = require('mongoose');

const dealRedemptionSchema = new mongoose.Schema({
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  membershipNumber: {
    type: String,
    required: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  },
  redeemedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['redeemed', 'canceled', 'expired'],
    default: 'redeemed'
  },
  notes: {
    type: String
  },
  // Optional tracking data
  redeemedBy: {
    type: String // Could be the business user ID who processed the redemption
  },
  locationData: {
    latitude: Number,
    longitude: Number,
    address: String
  }
}, {
  timestamps: true
});

// Enforce uniqueness for user-deal combinations
dealRedemptionSchema.index({ dealId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('DealRedemption', dealRedemptionSchema);
