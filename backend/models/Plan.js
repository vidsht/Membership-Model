const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({  name: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'GHS'
  },
  features: [{
    type: String,
    required: true
  }],
  description: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxUsers: {
    type: Number,
    default: null // null means unlimited
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'lifetime'],
    default: 'monthly'
  },
  priority: {
    type: Number,
    default: 0 // Higher numbers appear first
  },  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient querying
planSchema.index({ key: 1, isActive: 1 });
planSchema.index({ priority: -1 });

module.exports = mongoose.model('Plan', planSchema);
