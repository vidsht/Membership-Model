const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema({
  // System Settings
  systemName: {
    type: String,
    default: 'Indians in Ghana'
  },
  adminEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  loginImageUrl: {
    type: String,
    default: null
  },
  
  // Feature Toggles
  userRegistrationEnabled: {
    type: Boolean,
    default: true
  },
  autoApproveFree: {
    type: Boolean,
    default: true
  },
  requireApproval: {
    type: Boolean,
    default: true
  },
  showStats: {
    type: Boolean,
    default: true
  },  maintenanceMode: {
    type: Boolean,
    default: false
  },
  emailNotifications: {
    type: Boolean,
    default: true
  },
  partnerRegistrationEnabled: {
    type: Boolean,
    default: true
  },
  businessDirectoryEnabled: {
    type: Boolean,
    default: true
  },
    // Security Settings
  security: {
    minPasswordLength: {
      type: Number,
      default: 8,
      min: 6,
      max: 32
    },
    requireUppercase: {
      type: Boolean,
      default: true
    },
    requireLowercase: {
      type: Boolean,
      default: true
    },
    requireNumbers: {
      type: Boolean,
      default: true
    },
    requireSpecialChars: {
      type: Boolean,
      default: false
    },
    maxLoginAttempts: {
      type: Number,
      default: 5
    },
    lockoutDuration: {
      type: Number,
      default: 15 // minutes
    },
    sessionTimeout: {
      type: Number,
      default: 30 // minutes
    },
    allowRememberMe: {
      type: Boolean,
      default: true
    },
    enableIpRestriction: {
      type: Boolean,
      default: false
    },
    allowedIps: {
      type: [String],
      default: []
    },
    adminActionLogging: {
      type: Boolean,
      default: true
    },
    enhancedAdminSecurity: {
      type: Boolean,
      default: false
    },
    requireEmailVerification: {
      type: Boolean,
      default: true
    },
    emailChangeVerification: {
      type: Boolean,
      default: true
    },
    notifyPasswordReset: {
      type: Boolean,
      default: true
    }
  },
  
  // Social Media Requirements
  socialMediaRequirements: {
    facebook: {
      required: { type: Boolean, default: true },
      link: { type: String, default: 'https://facebook.com/indiansinghana' }
    },
    instagram: {
      required: { type: Boolean, default: true },
      link: { type: String, default: 'https://instagram.com/indians_in_ghana' }
    },
    youtube: {
      required: { type: Boolean, default: false },
      link: { type: String, default: 'https://youtube.com/indiansinghana' }
    },
    whatsappChannel: {
      required: { type: Boolean, default: true },
      link: { type: String, default: 'https://whatsapp.com/channel/indiansinghana' }
    },
    whatsappGroup: {
      required: { type: Boolean, default: true },
      link: { type: String, default: 'https://chat.whatsapp.com/indiansinghana' }
    }
  },
  
  // File Upload Settings
  fileUpload: {
    maxUploadSize: {
      type: Number,
      default: 5 // MB
    },
    allowedFileTypes: {
      type: [String],
      default: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']
    }
  },
    // Membership Plans
  membershipPlans: {
    showPlanSelection: { type: Boolean, default: true },
    communityEnabled: { type: Boolean, default: true },
    silverEnabled: { type: Boolean, default: true },
    goldEnabled: { type: Boolean, default: true },
    community: {
      name: { type: String, default: 'Community Plan' },
      price: { type: Number, default: 0 },
      features: { type: [String], default: ['Basic directory access', 'Community updates', 'Basic support'] },
      dealAccess: { type: String, default: 'basic' }, // basic, intermediate, full
      eventAccess: { type: Boolean, default: true }
    },
    silver: {
      name: { type: String, default: 'Silver Plan' },
      price: { type: Number, default: 50 },
      features: { type: [String], default: ['All community features', 'Priority support', 'Exclusive deals'] },
      dealAccess: { type: String, default: 'intermediate' },
      eventAccess: { type: Boolean, default: true }
    },
    gold: {
      name: { type: String, default: 'Gold Plan' },
      price: { type: Number, default: 150 },
      features: { type: [String], default: ['All silver features', 'Premium support', 'Business networking'] },
      dealAccess: { type: String, default: 'full' },
      eventAccess: { type: Boolean, default: true }
    }
  },
  
  // Card Settings
  cardSettings: {
    layout: {
      type: String,
      enum: ['default', 'modern', 'classic'],
      default: 'default'
    },
    expiryPeriod: {
      type: Number,
      default: 12 // months
    },
    showQRCode: {
      type: Boolean,
      default: true
    },
    showBarcode: {
      type: Boolean,
      default: true
    }
  },
  
  // Terms and Conditions
  termsConditions: {
    type: String,
    default: 'By using this service, you agree to abide by all rules and regulations set forth by the Indians in Ghana community. Membership benefits are subject to change without prior notice.'
  },
  
  // Display Settings
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'light'
  },
  language: {
    type: String,
    default: 'en'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
