const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessName: {
    type: String,
    required: true
  },
  discount: {
    type: String,
    required: function() {
      return ['percentage', 'fixed'].includes(this.discountType);
    }
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed', 'buyOneGetOne', 'freeItem'],
    default: 'percentage'
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  accessLevel: {
    type: String,
    enum: ['basic', 'intermediate', 'full'],
    default: 'basic',
    required: true
  },
  termsConditions: {
    type: String,
    trim: true
  },
  couponCode: {
    type: String,
    trim: true
  },
  maxRedemptions: {
    type: Number,
    min: 0,
    default: null
  },
  redemptionCount: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String
  },
  viewCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'scheduled'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Virtual field to check if deal is expired
dealSchema.virtual('isExpired').get(function() {
  return new Date() > this.validUntil;
});

// Check if deal is fully redeemed
dealSchema.virtual('isFullyRedeemed').get(function() {
  return this.maxRedemptions !== null && this.redemptionCount >= this.maxRedemptions;
});

// Pre-save middleware to handle status changes
dealSchema.pre('save', function(next) {
  // If deal is expired, set status to expired
  if (this.validUntil < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  
  // If deal is in the future, set status to scheduled
  if (this.validFrom > new Date() && this.isNew) {
    this.status = 'scheduled';
  }
  
  next();
});

// Create indexes for improved query performance
dealSchema.index({ businessId: 1 });
dealSchema.index({ status: 1 });
dealSchema.index({ validUntil: 1 });
dealSchema.index({ accessLevel: 1 });
dealSchema.index({ category: 1 });

module.exports = mongoose.model('Deal', dealSchema);
