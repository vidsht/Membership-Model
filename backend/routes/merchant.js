const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, merchant } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

// Middleware to check merchant status and access
const checkMerchantAccess = async (req, res, next) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // Get user, business, and plan information
    const query = `
      SELECT u.*, 
             b.businessId, b.businessName, b.businessDescription, b.businessCategory, 
             b.businessAddress, b.businessPhone, b.businessEmail, b.website,
             b.businessLicense, b.taxId, b.isVerified, b.verificationDate,
             b.membershipLevel, b.status as businessStatus, b.socialMediaFollowed as businessSocial,
             b.customDealLimit, b.currentPlan, b.planExpiryDate, b.planStatus, b.dealsUsedThisMonth,
             b.created_at as businessCreatedAt, b.maxDealsPerMonth,
             p.name as planName, p.max_deals_per_month as dealPostingLimit, p.priority as planPriority, p.price as planPrice,
             p.features as planFeatures, p.billingCycle
      FROM users u
      LEFT JOIN businesses b ON u.id = b.userId
      LEFT JOIN plans p ON b.currentPlan = p.key AND p.type = 'merchant'
      WHERE u.id = ? AND u.userType = 'merchant'
    `;

    const results = await queryAsync(query, [userId]);

    if (!results.length) {
      return res.status(404).json({ message: 'Merchant account not found' });
    }

    const user = results[0];

    // Check user status
    if (user.status === 'pending') {
      return res.status(403).json({ 
        message: 'Your profile is not yet accepted by the admin. Please wait for approval.',
        status: 'pending'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ 
        message: 'Your profile is temporarily suspended by admin. Please contact support.',
        status: 'suspended'
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ 
        message: 'Your profile is rejected by admin. Please contact support.',
        status: 'rejected'
      });
    }

    if (!user.businessId) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    // Check business status
    if (user.businessStatus === 'pending') {
      return res.status(403).json({ 
        message: 'Your business is not yet approved by the admin.',
        status: 'pending'
      });
    }

    if (user.businessStatus === 'suspended') {
      return res.status(403).json({ 
        message: 'Your business is temporarily suspended by admin.',
        status: 'suspended'
      });
    }

    if (user.businessStatus === 'rejected') {
      return res.status(403).json({ 
        message: 'Your business is rejected by admin.',
        status: 'rejected'
      });
    }

    // Check plan expiry
    if (user.planExpiryDate && new Date(user.planExpiryDate) < new Date()) {
      return res.status(403).json({ 
        message: 'Your plan has expired. Please renew to continue using merchant features.',
        status: 'expired',
        planExpiryDate: user.planExpiryDate,
        upgradeRequired: true
      });
    }

    // Calculate current month deal usage
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const dealsThisMonth = await queryAsync(`
      SELECT COUNT(*) as count 
      FROM deals 
      WHERE businessId = ? AND DATE_FORMAT(created_at, '%Y-%m') = ?
    `, [user.businessId, currentMonth]);

    user.actualDealsThisMonth = dealsThisMonth[0].count;
    user.dealLimit = user.customDealLimit || user.dealPostingLimit || user.maxDealsPerMonth || 0;
    user.canPostDeals = user.dealLimit === -1 || user.actualDealsThisMonth < user.dealLimit;

    req.merchant = user;
    next();
  } catch (error) {
    console.error('Merchant access check error:', error);
    return res.status(500).json({ message: 'Server error checking merchant access' });
  }
};

// Middleware to check if merchant can post deals
const checkDealPostingLimit = async (req, res, next) => {
  try {
    const merchant = req.merchant;
    
    if (!merchant.canPostDeals) {
      // Get upgrade options
      const upgradeQuery = `
        SELECT name, \`key\`, price, currency, max_deals_per_month as dealPostingLimit, features
        FROM plans 
        WHERE type = 'merchant' AND isActive = 1 AND priority > ?
        ORDER BY priority ASC, price ASC
        LIMIT 3
      `;
      const upgradeOptions = await queryAsync(upgradeQuery, [merchant.planPriority || 1]);

      return res.status(403).json({
        success: false,
        message: `You have reached your monthly deal posting limit of ${merchant.dealLimit}. Please upgrade your plan to post more deals.`,
        limitReached: true,
        currentUsage: merchant.actualDealsThisMonth,
        dealLimit: merchant.dealLimit,
        upgradeRequired: true,
        upgradeOptions: upgradeOptions.map(plan => ({
          name: plan.name,
          key: plan.key,
          price: plan.price,
          currency: plan.currency,
          dealPostingLimit: plan.dealPostingLimit === -1 ? 'Unlimited' : plan.dealPostingLimit,
          features: plan.features ? plan.features.split(',') : []
        }))
      });
    }

    next();
  } catch (error) {
    console.error('Error checking deal posting limit:', error);
    return res.status(500).json({ message: 'Server error checking deal limits' });
  }
};

// Utility function to promisify db.query
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};



// Merchant Dashboard - returns comprehensive stats and deals for the logged-in merchant
router.get('/dashboard', checkMerchantAccess, async (req, res) => {
  try {
    const merchant = req.merchant;    // Get deals for this business with detailed analytics
    const dealsQuery = `
      SELECT d.*, 
             (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id) as actualRedemptions,
             (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND DATE(dr.redeemed_at) = CURDATE()) as todayRedemptions
      FROM deals d 
      WHERE d.businessId = ?
      ORDER BY d.created_at DESC
    `;

    const dealResults = await queryAsync(dealsQuery, [merchant.businessId]);

    // Calculate comprehensive stats
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalDeals: dealResults.length,
      activeDeals: dealResults.filter(d => d.status === 'active').length,
      pendingDeals: dealResults.filter(d => d.status === 'pending_approval').length,
      expiredDeals: dealResults.filter(d => d.status === 'expired').length,
      totalViews: dealResults.reduce((sum, d) => sum + (d.views || 0), 0),
      totalRedemptions: dealResults.reduce((sum, d) => sum + (d.actualRedemptions || 0), 0),
      todayRedemptions: dealResults.reduce((sum, d) => sum + (d.todayRedemptions || 0), 0),
      thisMonthDeals: dealResults.filter(d => new Date(d.createdAt) >= thisMonth).length,
      actualDealsThisMonth: merchant.actualDealsThisMonth,
      dealLimit: merchant.dealLimit,
      dealLimitRemaining: merchant.dealLimit === -1 ? 'Unlimited' : Math.max(0, merchant.dealLimit - merchant.actualDealsThisMonth),
      canPostDeals: merchant.canPostDeals
    };    // Get recent redemptions with user details
    const recentRedemptionsQuery = `
      SELECT dr.*, u.fullName, u.membershipNumber, d.title as dealTitle
      FROM deal_redemptions dr
      JOIN users u ON dr.user_id = u.id
      JOIN deals d ON dr.deal_id = d.id
      WHERE d.businessId = ?
      ORDER BY dr.redeemed_at DESC
      LIMIT 10
    `;

    const redemptionResults = await queryAsync(recentRedemptionsQuery, [merchant.businessId]);

    // Get upgrade suggestions if merchant is near limit
    let upgradeOptions = [];
    if (!merchant.canPostDeals || (merchant.dealLimit > 0 && merchant.actualDealsThisMonth >= merchant.dealLimit * 0.8)) {
      const upgradeQuery = `
        SELECT name, \`key\`, price, currency, dealPostingLimit, features
        FROM plans 
        WHERE type = 'merchant' AND isActive = 1 AND priority > ?
        ORDER BY priority ASC, price ASC
        LIMIT 3
      `;
      upgradeOptions = await queryAsync(upgradeQuery, [merchant.planPriority || 1]);
    }

    res.json({
      success: true,
      data: {
        stats,
        deals: dealResults,
        recentRedemptions: redemptionResults,
        business: {
          businessId: merchant.businessId,
          businessName: merchant.businessName,
          businessDescription: merchant.businessDescription,
          businessCategory: merchant.businessCategory,
          businessAddress: merchant.businessAddress,
          businessPhone: merchant.businessPhone,
          businessEmail: merchant.businessEmail,
          website: merchant.website,
          businessLicense: merchant.businessLicense,
          taxId: merchant.taxId,
          isVerified: merchant.isVerified,
          verificationDate: merchant.verificationDate,
          membershipLevel: merchant.membershipLevel,
          status: merchant.businessStatus,
          socialMediaFollowed: merchant.businessSocial,
          customDealLimit: merchant.customDealLimit,
          currentPlan: merchant.currentPlan,
          planExpiryDate: merchant.planExpiryDate,
          planStatus: merchant.planStatus,
          businessCreatedAt: merchant.businessCreatedAt
        },
        user: {
          id: merchant.id,
          fullName: merchant.fullName,
          email: merchant.email,
          status: merchant.status,
          userType: merchant.userType,
          statusUpdatedAt: merchant.statusUpdatedAt,
          statusUpdatedBy: merchant.statusUpdatedBy
        },
        plan: {
          key: merchant.currentPlan || 'basic_business',
          name: merchant.planName || 'Basic Business',
          dealPostingLimit: merchant.dealLimit,
          priority: merchant.planPriority || 1,
          price: merchant.planPrice || 0,
          currency: 'GHS',
          billingCycle: merchant.billingCycle || 'monthly',
          features: merchant.planFeatures ? merchant.planFeatures.split(',') : []
        },
        upgradeOptions: upgradeOptions.length > 0 ? upgradeOptions : null
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});


// Get all merchants (admin only)
router.get('/', auth, (req, res) => {
  // Check if user is admin
  db.query('SELECT adminRole FROM users WHERE id = ?', [req.session.userId], (err, userResults) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!userResults.length || !userResults[0].adminRole) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Get all businesses with user information
    const query = `
      SELECT b.*, u.fullName, u.email, u.phone, u.status as userStatus, u.created_at as userCreatedAt
      FROM businesses b
      JOIN users u ON b.userId = u.id
      ORDER BY b.created_at DESC
    `;

    db.query(query, (err, results) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json({ success: true, merchants: results });
    });
  });
});

// Get merchant by ID
router.get('/:id', auth, (req, res) => {
  const query = `
    SELECT b.*, u.fullName, u.email, u.phone, u.status as userStatus, u.created_at as userCreatedAt,
           (SELECT COUNT(*) FROM deals WHERE businessId = b.businessId) as totalDeals,
           (SELECT COUNT(*) FROM deals WHERE businessId = b.businessId AND status = 'active') as activeDeals
    FROM businesses b
    JOIN users u ON b.userId = u.id
    WHERE b.businessId = ?
  `;

  db.query(query, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!results.length) return res.status(404).json({ message: 'Merchant not found' });
    res.json({ success: true, merchant: results[0] });
  });
});

// Create a new deal (merchant only)
router.post('/deals', checkMerchantAccess, checkDealPostingLimit, [
  body('title').notEmpty().withMessage('Deal title is required'),
  body('description').notEmpty().withMessage('Deal description is required'),
  body('category').notEmpty().withMessage('Deal category is required'),
  body('discount').notEmpty().withMessage('Discount is required'),
  body('discountType').isIn(['percentage', 'fixed', 'bogo', 'other']).withMessage('Invalid discount type'),  body('expiration_date').isISO8601().withMessage('Valid expiration date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }

  const merchant = req.merchant;

  // Check deal limit
  const dealLimit = merchant.customDealLimit || 0;
  if (dealLimit > 0 && (merchant.dealsUsedThisMonth || 0) >= dealLimit) {
    return res.status(403).json({ 
      message: 'Reached monthly deal limit. Upgrade plan to add more deals.',
      dealLimit,
      dealsUsed: merchant.dealsUsedThisMonth || 0
    });
  }  const {
    title,
    description,
    category,
    discount,
    discountType,
    originalPrice,
    discountedPrice,
    termsConditions,
    expiration_date,
    imageUrl,
    couponCode,
    requiredPlanPriority  } = req.body;

  // Get plan information for accessLevel field (for display purposes)
  let planName = null;
  if (requiredPlanPriority) {
    try {
      const planResults = await new Promise((resolve, reject) => {
        db.query('SELECT name FROM plans WHERE priority = ? AND type = "user" AND isActive = 1 LIMIT 1',
          [requiredPlanPriority], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
      });
      if (planResults.length > 0) {
        planName = planResults[0].name;
      }
    } catch (error) {
      console.error('Error fetching plan name:', error);
    }
  }

  const insertQuery = `
    INSERT INTO deals 
    (businessId, title, description, category, discount, discountType, originalPrice, discountedPrice, termsConditions, validFrom, validUntil, couponCode, requiredPlanPriority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval')
  `;

  const values = [
    merchant.businessId,
    title,
    description,
    category,
    discount,
    discountType,
    originalPrice || null,
    discountedPrice || null,
    termsConditions || null,
    expiration_date, // validFrom
    expiration_date, // validUntil  
    couponCode || null,
    requiredPlanPriority || 1
  ];

  db.query(insertQuery, values, (err, result) => {
    if (err) {
      console.error('Create deal error:', err);
      return res.status(500).json({ message: 'Server error creating deal' });
    }

    // Update deals used count
    db.query('UPDATE businesses SET dealsUsedThisMonth = dealsUsedThisMonth + 1 WHERE businessId = ?', [merchant.businessId], (updateErr) => {
      if (updateErr) console.error('Failed to update deals count:', updateErr);
    });

    // TODO: Send notification to admin about new deal pending approval

    res.status(201).json({ 
      success: true,
      message: 'Deal created successfully and is pending admin approval',
      dealId: result.insertId
    });
  });
});

// Update merchant business information
router.put('/profile', checkMerchantAccess, [
  body('businessName').notEmpty().withMessage('Business name is required'),
  body('businessCategory').notEmpty().withMessage('Business category is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }

  const merchant = req.merchant;
  const {
    businessName,
    businessDescription,
    businessCategory,
    businessAddress,
    businessPhone,
    businessEmail,
    website
  } = req.body;

  const updateQuery = `
    UPDATE businesses 
    SET businessName=?, businessDescription=?, businessCategory=?, businessAddress=?, businessPhone=?, businessEmail=?, website=?, updated_at=NOW()
    WHERE businessId=?
  `;

  const values = [businessName, businessDescription, businessCategory, businessAddress, businessPhone, businessEmail, website, merchant.businessId];

  db.query(updateQuery, values, (err) => {
    if (err) {
      console.error('Update business profile error:', err);
      return res.status(500).json({ message: 'Server error updating profile' });
    }
    res.json({ success: true, message: 'Business profile updated successfully' });
  });
});

// Get merchant certificate (for approved merchants)
router.get('/certificate', checkMerchantAccess, (req, res) => {
  const merchant = req.merchant;

  if (merchant.businessStatus !== 'approved' && merchant.businessStatus !== 'active') {
    return res.status(403).json({ 
      message: 'Certificate is only available for approved businesses',
      status: merchant.businessStatus
    });
  }

  // Generate certificate data
  const certificateData = {
    businessId: merchant.businessId,
    businessName: merchant.businessName,
    membershipNumber: merchant.membershipNumber,
    issueDate: merchant.verificationDate || merchant.created_at,
    status: merchant.businessStatus,
    qrCode: `https://indiansinghana.com/verify/business/${merchant.businessId}`,
    barcode: merchant.businessId.toString().padStart(12, '0')
  };

  res.json({ success: true, certificate: certificateData });
});

// Get deal analytics for merchant
router.get('/analytics/deals/:dealId?', checkMerchantAccess, (req, res) => {
  const merchant = req.merchant;
  const dealId = req.params.dealId;

  let query, params;

  if (dealId) {
    // Analytics for specific deal
    query = `      SELECT d.*, 
             (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.dealId = d.id) as totalRedemptions,
             (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.dealId = d.id AND DATE(dr.redeemedAt) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as monthlyRedemptions,
             (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.dealId = d.id AND DATE(dr.redeemedAt) = CURDATE()) as todayRedemptions
      FROM deals d
      WHERE d.id = ? AND d.businessId = ?
    `;
    params = [dealId, merchant.businessId];
  } else {
    // Analytics for all deals
    query = `      SELECT d.id, d.title, d.views, d.redemptions, d.status, d.created_at,
             (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.dealId = d.id) as actualRedemptions
      FROM deals d
      WHERE d.businessId = ?
      ORDER BY d.created_at DESC
    `;
    params = [merchant.businessId];
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Analytics query error:', err);
      return res.status(500).json({ message: 'Server error fetching analytics' });
    }

    if (dealId) {
      if (!results.length) {
        return res.status(404).json({ message: 'Deal not found' });
      }

      // Get redemption details for specific deal
      const redemptionsQuery = `
        SELECT dr.redeemedAt, u.fullName, u.membershipNumber
        FROM deal_redemptions dr
        JOIN users u ON dr.userId = u.id
        WHERE dr.dealId = ?
        ORDER BY dr.redeemedAt DESC
      `;

      db.query(redemptionsQuery, [dealId], (err2, redemptions) => {
        if (err2) {
          console.error('Redemptions query error:', err2);
          return res.status(500).json({ message: 'Server error fetching redemptions' });
        }

        res.json({ 
          success: true, 
          deal: results[0], 
          redemptions 
        });
      });
    } else {
      res.json({ success: true, deals: results });
    }
  });
});

// Get merchant notifications
router.get('/notifications', checkMerchantAccess, async (req, res) => {
  try {
    const merchant = req.merchant;
    
    if (!(await tableExists('notifications'))) {
      return res.json({
        success: true,
        notifications: [],
        message: 'Notifications table not found'
      });
    }

    // Get notifications for this merchant
    const query = `
      SELECT n.*, d.title as dealTitle
      FROM notifications n
      LEFT JOIN deals d ON n.relatedId = d.id AND n.type IN ('deal_approved', 'deal_rejected')
      WHERE n.userId = (SELECT userId FROM businesses WHERE businessId = ?)
      ORDER BY n.created_at DESC
      LIMIT 50
    `;
    
    const notifications = await queryAsync(query, [merchant.businessId]);
    
    res.json({
      success: true,
      notifications
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching notifications',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', checkMerchantAccess, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const merchant = req.merchant;
    
    if (!notificationId || isNaN(notificationId)) {
      return res.status(400).json({ success: false, message: 'Valid notification ID is required' });
    }

    if (!(await tableExists('notifications'))) {
      return res.status(404).json({ success: false, message: 'Notifications table not found' });
    }

    // Update notification as read, ensuring it belongs to this merchant
    const result = await queryAsync(
      'UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = (SELECT userId FROM businesses WHERE businessId = ?)', 
      [notificationId, merchant.businessId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating notification'
    });
  }
});

module.exports = router;
