const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Deal = require('../models/Deal');
const Business = require('../models/Business');
const { auth, merchant } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../uploads/deals');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'merchant-deal-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Validation rules for merchant deals
const merchantDealValidationRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('discount').notEmpty().withMessage('Discount value is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('validFrom').isISO8601().withMessage('Valid start date is required'),
  body('validUntil').isISO8601().withMessage('Valid end date is required')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.validFrom)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('accessLevel').isIn(['basic', 'intermediate', 'full']).withMessage('Invalid access level')
];

// Get merchant dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    
    if (!user || user.userType !== 'merchant') {
      return res.status(403).json({ message: 'Access denied. Merchant account required.' });
    }

    // Mock data for now - in a real app, you'd query deals from a deals collection
    const dashboardData = {
      stats: {
        totalDeals: 0,
        activeDeals: 0,
        totalViews: 0,
        totalRedemptions: 0
      },
      deals: [],
      businessInfo: user.businessInfo,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        businessInfo: user.businessInfo
      }
    };

    res.json({
      message: 'Dashboard data retrieved successfully',
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update merchant business info
router.put('/business-info', auth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    
    if (!user || user.userType !== 'merchant') {
      return res.status(403).json({ message: 'Access denied. Merchant account required.' });
    }

    const {
      businessName,
      businessDescription,
      businessCategory,
      businessAddress,
      businessPhone,
      businessEmail,
      website,
      businessLicense,
      taxId
    } = req.body;

    // Update business info
    user.businessInfo = {
      ...user.businessInfo,
      businessName: businessName || user.businessInfo.businessName,
      businessDescription: businessDescription || user.businessInfo.businessDescription,
      businessCategory: businessCategory || user.businessInfo.businessCategory,
      businessAddress: businessAddress || user.businessInfo.businessAddress,
      businessPhone: businessPhone || user.businessInfo.businessPhone,
      businessEmail: businessEmail || user.businessInfo.businessEmail,
      website: website || user.businessInfo.website,
      businessLicense: businessLicense || user.businessInfo.businessLicense,
      taxId: taxId || user.businessInfo.taxId
    };

    await user.save();

    res.json({
      message: 'Business information updated successfully',
      businessInfo: user.businessInfo
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get merchant deals
router.get('/deals', auth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    
    if (!user || user.userType !== 'merchant') {
      return res.status(403).json({ message: 'Access denied. Merchant account required.' });
    }

    // Find the merchant's business
    const business = await Business.findOne({ ownerId: user._id });
    if (!business) {
      return res.status(400).json({ message: 'No business found for this merchant.' });
    }

    // Get deals for this merchant's business
    const deals = await Deal.find({ businessId: business._id }).sort({ createdAt: -1 });

    res.json({      message: 'Deals retrieved successfully',
      deals: deals
    });
  } catch (error) {
    console.error('Error fetching merchant deals:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create deal for merchant
router.post('/deals', auth, upload.single('featuredImage'), merchantDealValidationRules, async (req, res) => {
  console.log('Received merchant deal creation request');
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);
  
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const user = await User.findById(req.session.userId);
    
    if (!user || user.userType !== 'merchant') {
      return res.status(403).json({ message: 'Access denied. Merchant account required.' });
    }

    // Find the merchant's business
    const business = await Business.findOne({ ownerId: user._id });
    if (!business) {
      return res.status(400).json({ message: 'No business found for this merchant. Please complete business registration first.' });
    }

    // Create new deal
    const newDeal = new Deal({
      title: req.body.title,
      description: req.body.description,
      businessId: business._id,
      businessName: business.businessName,
      discount: req.body.discount,
      discountType: req.body.discountType || 'percentage',
      category: req.body.category,
      validFrom: req.body.validFrom,
      validUntil: req.body.validUntil,
      accessLevel: req.body.accessLevel,
      termsConditions: req.body.termsConditions,
      couponCode: req.body.couponCode,
      maxRedemptions: req.body.maxRedemptions || null,
      status: 'active' // Merchant deals are active by default
    });

    // If there's an image uploaded
    if (req.file) {
      const relativePath = path.relative(path.join(__dirname, '../uploads'), req.file.path);
      newDeal.imageUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    }

    await newDeal.save();

    res.status(201).json({
      message: 'Deal created successfully',
      deal: newDeal
    });
  } catch (error) {
    console.error('Error creating merchant deal:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update deal (placeholder)
router.put('/deals/:dealId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    
    if (!user || user.userType !== 'merchant') {
      return res.status(403).json({ message: 'Access denied. Merchant account required.' });
    }

    const { dealId } = req.params;
    const { title, description, discount, validUntil, terms, status } = req.body;

    // Mock deal update - in a real app, you'd update in deals collection
    const updatedDeal = {
      id: dealId,
      title,
      description,
      discount,
      validUntil,
      terms,
      status,
      merchantId: user._id,
      updatedAt: new Date()
    };

    res.json({
      message: 'Deal updated successfully',
      deal: updatedDeal
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete deal (placeholder)
router.delete('/deals/:dealId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    
    if (!user || user.userType !== 'merchant') {
      return res.status(403).json({ message: 'Access denied. Merchant account required.' });
    }

    const { dealId } = req.params;

    // Mock deal deletion - in a real app, you'd delete from deals collection
    res.json({
      message: 'Deal deleted successfully',
      dealId: dealId
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
