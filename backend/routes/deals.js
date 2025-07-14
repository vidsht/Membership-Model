const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Deal = require('../models/Deal');
const Business = require('../models/Business');
const User = require('../models/User');
const DealRedemption = require('../models/DealRedemption');
const { auth, admin } = require('../middleware/auth');

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
    cb(null, 'deal-' + uniqueSuffix + path.extname(file.originalname));
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

// Validation rules
const dealValidationRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('businessId').isMongoId().withMessage('Valid business ID is required'),
  body('discount').if(body('discountType').not().equals('buyOneGetOne').not().equals('freeItem'))
    .notEmpty().withMessage('Discount value is required'),
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

// @route   GET /api/admin/deals
// @desc    Get all deals with filtering and pagination
// @access  Private (Admin only)
router.get('/deals', auth, admin, async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Fetch deals and add redemption counts
    const deals = await Deal.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get redemption counts for each deal
    const dealIds = deals.map(d => d._id);
    const redemptions = await DealRedemption.aggregate([
      { $match: { dealId: { $in: dealIds } } },
      { $group: { _id: '$dealId', count: { $sum: 1 } } }
    ]);
    const redemptionMap = {};
    redemptions.forEach(r => { redemptionMap[r._id.toString()] = r.count; });

    // Attach redemptionCount to each deal
    const dealsWithStats = deals.map(deal => {
      const d = deal.toObject();
      d.redemptionCount = redemptionMap[deal._id.toString()] || 0;
      return d;
    });

    // Count active deals
    const activeDealsCount = await Deal.countDocuments({ ...query, status: 'active' });
    const totalDeals = await Deal.countDocuments(query);

    // Total redemptions for all deals in this query
    const totalRedemptions = await DealRedemption.countDocuments(query.status ? { dealId: { $in: dealIds } } : {});

    res.json({
      deals: dealsWithStats,
      stats: {
        activeDeals: activeDealsCount,
        totalDeals,
        totalRedemptions
      },
      pagination: {
        total: totalDeals,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalDeals / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/deals/:id
// @desc    Get a single deal by ID
// @access  Private (Admin only)
router.get('/deals/:id', auth, admin, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    // Fetch associated business data
    const business = await Business.findById(deal.businessId);
    if (business) {
      deal.businessName = business.businessName;
    }

    // Fetch redemption count for this deal
    const redemptionCount = await DealRedemption.countDocuments({ dealId: deal._id });
    const dealObj = deal.toObject();
    dealObj.redemptionCount = redemptionCount;

    res.json(dealObj);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/deals
// @desc    Create a new deal
// @access  Private (Admin only)
router.post('/deals', auth, admin, upload.single('featuredImage'), dealValidationRules, async (req, res) => {
  console.log('Received deal creation request');
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);
  
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
    try {
    // Verify the business exists (check in User model for merchants)
    const business = await User.findById(req.body.businessId);
    if (!business || business.userType !== 'merchant' || !business.businessInfo?.businessName) {
      return res.status(400).json({ message: 'Invalid business ID or business not found' });
    }
    
    // Create new deal
    const newDeal = new Deal({
      title: req.body.title,
      description: req.body.description,
      businessId: req.body.businessId,
      businessName: business.businessInfo.businessName, // Store business name for easy reference
      discount: req.body.discount,
      discountType: req.body.discountType,
      category: req.body.category,
      validFrom: req.body.validFrom,
      validUntil: req.body.validUntil,
      accessLevel: req.body.accessLevel,
      termsConditions: req.body.termsConditions,
      couponCode: req.body.couponCode,
      maxRedemptions: req.body.maxRedemptions || null,
      status: req.body.status || 'active'
    });
    
    // If there's an image uploaded
    if (req.file) {
      // Convert the file path to a URL path
      const relativePath = path.relative(path.join(__dirname, '../uploads'), req.file.path);
      newDeal.imageUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    }
    
    await newDeal.save();
    
    res.status(201).json(newDeal);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/deals/:id
// @desc    Update an existing deal
// @access  Private (Admin only)
router.put('/deals/:id', auth, admin, upload.single('featuredImage'), dealValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    // Find the deal to update
    let deal = await Deal.findById(req.params.id);
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
      // Verify the business exists (check in User model for merchants)
    const business = await User.findById(req.body.businessId);
    if (!business || business.userType !== 'merchant' || !business.businessInfo?.businessName) {
      return res.status(400).json({ message: 'Invalid business ID or business not found' });
    }
    
    // Prepare update object
    const updateData = {
      title: req.body.title,
      description: req.body.description,
      businessId: req.body.businessId,
      businessName: business.businessInfo.businessName,
      discount: req.body.discount,
      discountType: req.body.discountType,
      category: req.body.category,
      validFrom: req.body.validFrom,
      validUntil: req.body.validUntil,
      accessLevel: req.body.accessLevel,
      termsConditions: req.body.termsConditions,
      couponCode: req.body.couponCode,
      maxRedemptions: req.body.maxRedemptions || null,
      status: req.body.status
    };
    
    // If there's a new image uploaded
    if (req.file) {
      // Delete old image if it exists
      if (deal.imageUrl) {
        const oldImagePath = path.join(__dirname, '..', deal.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      // Convert the file path to a URL path
      const relativePath = path.relative(path.join(__dirname, '../uploads'), req.file.path);
      updateData.imageUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    }
    
    // Update the deal
    deal = await Deal.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    
    res.json(deal);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/admin/deals/:id/status
// @desc    Update deal status
// @access  Private (Admin only)
router.patch('/deals/:id/status', auth, admin, [
  body('status').isIn(['active', 'inactive']).withMessage('Invalid status')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    res.json({ message: 'Deal status updated', deal });
  } catch (error) {
    console.error('Error updating deal status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/deals/:id
// @desc    Delete a deal
// @access  Private (Admin only)
router.delete('/deals/:id', auth, admin, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Delete the deal's image if it exists
    if (deal.imageUrl) {
      const imagePath = path.join(__dirname, '..', deal.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Delete any associated redemptions
    await DealRedemption.deleteMany({ dealId: deal._id });
    
    // Delete the deal
    await Deal.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/deals/:id/redemptions
// @desc    Get all redemptions for a deal
// @access  Private (Admin only)
router.get('/deals/:id/redemptions', auth, admin, async (req, res) => {
  try {
    const dealId = req.params.id;
    
    // Verify deal exists
    const dealExists = await Deal.findById(dealId);
    if (!dealExists) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Get redemptions
    const redemptions = await DealRedemption.find({ dealId })
      .sort({ redeemedAt: -1 });
    
    res.json(redemptions);
  } catch (error) {
    console.error('Error fetching deal redemptions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
