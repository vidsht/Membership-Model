const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerName: {
    type: String,
    required: true
  },
  businessDescription: {
    type: String,
    trim: true
  },
  businessCategory: { 
    type: String, 
    enum: ['restaurant', 'retail', 'services', 'healthcare', 'technology', 'education', 'entertainment', 'travel', 'other'],
    required: true,
    trim: true 
  },
  businessAddress: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, default: 'Ghana', trim: true }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  contactInfo: {
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    website: { type: String, trim: true }
  },
  socialMedia: {
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    twitter: { type: String, trim: true },
    linkedin: { type: String, trim: true }
  },
  businessHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  logoUrl: {
    type: String
  },
  coverImageUrl: {
    type: String
  },
  galleryImages: [{
    type: String
  }],
  businessLicense: { 
    type: String, 
    trim: true 
  },
  taxId: { 
    type: String, 
    trim: true 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  verificationDate: { 
    type: Date 
  },
  membershipLevel: {
    type: String,
    enum: ['basic', 'premium', 'featured'],
    default: 'basic'
  },
  featuredUntil: {
    type: Date
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended'],
    default: 'pending'
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Create geospatial index for location queries
businessSchema.index({ location: '2dsphere' });
businessSchema.index({ businessName: 'text', businessDescription: 'text' });
businessSchema.index({ businessCategory: 1 });
businessSchema.index({ status: 1 });

module.exports = mongoose.model('Business', businessSchema);
