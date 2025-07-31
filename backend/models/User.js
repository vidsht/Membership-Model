const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, default: 'Ghana', trim: true }
  },
  profilePicture: {
    type: String,
    default: ''
  },
  membershipType: {
    type: String,
    // enum removed to allow custom plan keys
    default: 'community'
  },
  membershipNumber: {
    type: String,
    unique: true,
    sparse: true
  },  // User type: regular user, merchant, or admin
  userType: {
    type: String,
    enum: ['user', 'merchant', 'admin'],
    default: 'user'
  },
  // User status for approval workflow
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  // Admin-specific fields
  adminRole: {
    type: String,
    enum: ['superAdmin', 'userManager', 'contentManager', 'analyst'],
    default: 'contentManager'
  },
  permissions: {
    type: [String],
    default: []
  },
  // Merchant-specific fields
  businessInfo: {
    businessName: { type: String, trim: true },
    businessDescription: { type: String, trim: true },
    businessCategory: { 
      type: String, 
      enum: ['restaurant', 'retail', 'services', 'healthcare', 'technology', 'other'],
      trim: true 
    },
    businessAddress: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, default: 'Ghana', trim: true }
    },
    businessPhone: { type: String, trim: true },
    businessEmail: { type: String, lowercase: true, trim: true },
    website: { type: String, trim: true },
    businessLicense: { type: String, trim: true },
    taxId: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    verificationDate: { type: Date }
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },  preferences: {
    newsletter: { type: Boolean, default: true },
    eventNotifications: { type: Boolean, default: true },
    memberDirectory: { type: Boolean, default: true }
  },
  // Plan assignment tracking
  planAssignedAt: {
    type: Date
  },
  planAssignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  planDetails: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Generate membership number before saving
userSchema.pre('save', async function(next) {
  // Generate membership number if it doesn't exist
  if (!this.membershipNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('User').countDocuments();
    
    // Different prefixes for different user types
    let prefix = 'IIG'; // Default for regular users
    if (this.userType === 'merchant') {
      prefix = 'MER';
    } else if (this.userType === 'admin') {
      prefix = 'ADM';
    }
    
    this.membershipNumber = `${prefix}${year}${String(count + 1).padStart(4, '0')}`;
  }
  
  // Hash password if modified
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
