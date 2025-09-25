const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, merchant } = require('../middleware/auth');
const db = require('../db');
const NotificationHooks = require('../services/notificationHooks-integrated');
const { logActivity, logDealStatusChange, ACTIVITY_TYPES } = require('../utils/activityLogger');

const router = express.Router();

// Check if table exists helper function
const tableExists = async (tableName) => {
  try {
    await queryAsync(`SELECT 1 FROM ${tableName} LIMIT 1`);
    return true;
  } catch (error) {
    return false;
  }
};

// Add debugging middleware to log all requests to merchant routes
router.use((req, res, next) => {
  console.log(`[MERCHANT ROUTE DEBUG] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Required DB columns and tables used by merchant feature-access logic:
// - users (u):
//   - id: primary user id (used to join and identify merchant)
//   - membershipType: primary source of truth for the merchant's plan (maps to plans.key)
//   - status: account approval/suspension state ('approved','pending','suspended','rejected')
//   - planExpiryDate: when the user's plan expires (used to block access when expired)
//   - fullName, email, userType, statusUpdatedAt, statusUpdatedBy: meta fields returned in dashboard
// - businesses (b):
//   - businessId, businessName, businessDescription, businessCategory, businessAddress, businessPhone, businessEmail
//   - membershipLevel: legacy/branding field (DO NOT use for access decisions) — kept for display only
//   - customDealLimit: admin override that takes priority over plan's max_deals_per_month
//   - maxDealsPerMonth / maxDealsPerMonth (business-level fallback for deal limits)
//   - dealsUsedThisMonth (if present) / dealsUsedThisMonth may be tracked but we compute actual usage from deals table
// - plans (p):
//   - key: plan key used to join with users.membershipType
//   - priority: numeric tier used for upgrade suggestions and feature tiers
//   - max_deals_per_month: default deal posting limit for this plan
//   - features: CSV string (or JSON) describing enabled features for the plan (e.g. 'analytics,featuredPlacement')
//   - price, currency, billingCycle: display and upgrade information
// Additional tables used at runtime:
// - deals: used to count current month's postings for the business (to enforce monthly limit)
// - deal_redemptions: analytics only
//
// Rule summary:
// 1) The single source of truth for plan/feature decisions is users.membershipType joined to plans.key (p.type = 'merchant').
// 2) Business.membershipLevel is a display/legacy field and must NOT be used for permission checks.
// 3) Deal posting limit is determined in this priority: businesses.customDealLimit (if set) -> plans.max_deals_per_month -> business.maxDealsPerMonth or 0.
// 4) A special value of -1 indicates "Unlimited" deals.
// 5) If planExpiryDate is in the past, merchant access is blocked and upgradeRequired is set.
// 6) plan.priority is used to suggest upgrades and decide feature tiers; plan.features provides granular feature flags.
//
// To centralize and make the logic explicit we compute derived fields from the DB row below.
const computeMerchantAccess = (row = {}, actualDealsThisMonth = 0) => {
  const access = {};
  access.actualDealsThisMonth = Number(actualDealsThisMonth || 0);

  // Plan-level posting limit (from plans.max_deals_per_month alias 'dealPostingLimit')
  const planLimit = row.dealPostingLimit !== undefined && row.dealPostingLimit !== null
    ? Number(row.dealPostingLimit)
    : (row.maxDealsPerMonth !== undefined && row.maxDealsPerMonth !== null ? Number(row.maxDealsPerMonth) : 0);

  // Custom business override
  const customLimit = row.customDealLimit;
  if (customLimit !== null && customLimit !== undefined) {
    access.dealLimit = Number(customLimit);
    access.isCustomLimit = true;
  } else {
    access.dealLimit = planLimit;
    access.isCustomLimit = false;
  }

  // Can post deals if unlimited (-1) or under limit
  access.canPostDeals = access.dealLimit === -1 || access.actualDealsThisMonth < access.dealLimit;

  // Plan meta
  access.planPriority = row.planPriority !== undefined && row.planPriority !== null ? Number(row.planPriority) : 1;
  access.planFeatures = row.planFeatures ? String(row.planFeatures).split(',').map(f => f.trim()).filter(Boolean) : [];
  access.membershipType = row.membershipType || 'basic';

  // Derived flags for frontend convenience
  access.isBasicPlan = !access.membershipType || ['basic'].includes(access.membershipType);
  access.isFeatured = ['gold_merchant', 'gold_business', 'platinum_merchant', 'platinum_business', 'platinum_plus', 'platinum_plus_business'].includes(access.membershipType);
  access.isPremium = ['silver_merchant', 'silver_business'].includes(access.membershipType);

  return access;
};

// Helper function to update expired deals
const updateExpiredDeals = async () => {
  try {
    const updateQuery = `
      UPDATE deals 
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' 
        AND ((validUntil IS NOT NULL AND validUntil < CURDATE()) 
             OR (expiration_date IS NOT NULL AND expiration_date < CURDATE()))
    `;
    
    const result = await queryAsync(updateQuery);
    if (result.affectedRows > 0) {
      console.log(`Updated ${result.affectedRows} expired deals to 'expired' status`);
    }
    return result.affectedRows;
  } catch (error) {
    console.error('Error updating expired deals:', error);
    return 0;
  }
};

// Middleware to check merchant status and access
const checkMerchantAccess = async (req, res, next) => {
  console.log('[DEBUG MIDDLEWARE] checkMerchantAccess called');
  console.log('[DEBUG MIDDLEWARE] Session:', req.session);
  console.log('[DEBUG MIDDLEWARE] Session userId:', req.session?.userId);
  
  const userId = req.session.userId;
  if (!userId) {
    console.log('[DEBUG MIDDLEWARE] No userId in session - returning 401');
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // Get user, business, and plan information
    const query = `
      SELECT u.*, 
             b.businessId, b.businessName, b.businessDescription, b.businessCategory, 
             b.businessAddress, b.businessPhone, b.businessEmail, b.website,
             b.businessLicense, b.taxId, b.isVerified, b.verificationDate,
             b.socialMediaFollowed as businessSocial,
             b.customDealLimit, b.planExpiryDate, b.dealsUsedThisMonth,
             b.created_at as businessCreatedAt, b.maxDealsPerMonth,
             p.name as planName, p.description as planDescription, p.max_deals_per_month as dealPostingLimit, p.priority as planPriority, p.price as planPrice,
             p.features as planFeatures, p.billingCycle
      FROM users u
      LEFT JOIN businesses b ON u.id = b.userId
      LEFT JOIN plans p ON u.membershipType = p.key AND p.type = 'merchant'
      WHERE u.id = ?
    `;

    const results = await queryAsync(query, [userId]);

    if (!results.length) {
      return res.status(404).json({ message: 'Merchant account not found' });
    }

    const user = results[0];

    // Check user status from users table (this is where admin updates are made)
    if (user.status === 'pending') {
      return res.status(403).json({ 
        message: 'Your profile is not yet approved by the admin. Please wait for approval.',
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

    if (user.status !== 'approved') {
      return res.status(403).json({ 
        message: 'Your account needs to be approved by admin before accessing merchant features.',
        status: user.status
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
    
    // Compute and normalize merchant access fields
    const access = computeMerchantAccess(user, user.actualDealsThisMonth);
    Object.assign(user, access);

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
    
    console.log(`Deal Posting Check - CanPost: ${merchant.canPostDeals}, Limit: ${merchant.dealLimit}, Used: ${merchant.actualDealsThisMonth}, Custom: ${merchant.isCustomLimit}`);
    
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

      const limitMessage = merchant.isCustomLimit 
        ? `You've reached your monthly deal limit of ${merchant.dealLimit}. ${merchant.dealLimit === 0 ? 'Your deal posting has been disabled.' : 'Contact admin to increase your custom limit.'}`
        : `You've reached your monthly deal limit of ${merchant.dealLimit}. Upgrade your plan for more deals.`;

      return res.status(403).json({
        success: false,
        message: limitMessage,
        limitReached: true,
        currentUsage: merchant.actualDealsThisMonth,
        dealLimit: merchant.dealLimit,
        isCustomLimit: merchant.isCustomLimit,
        upgradeRequired: !merchant.isCustomLimit, // Only show upgrade if not using custom limit
        upgradeOptions: merchant.isCustomLimit ? [] : upgradeOptions.map(plan => ({
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
    const merchant = req.merchant;
    
    // Update expired deals before fetching data
    await updateExpiredDeals();
    
    // Get deals for this business with detailed analytics
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
      isCustomLimit: merchant.isCustomLimit,
      dealLimitRemaining: merchant.dealLimit === -1 ? 'Unlimited' : Math.max(0, merchant.dealLimit - merchant.actualDealsThisMonth),
      canPostDeals: merchant.canPostDeals,
      nextMonthReset: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0], // Next month's first day
      canPostDeals: merchant.canPostDeals
    };    // Get recent redemptions with user details - only show APPROVED redemptions
    const recentRedemptionsQuery = `
      SELECT dr.*, u.fullName, u.phone, u.membershipNumber, d.title as dealTitle
      FROM deal_redemptions dr
      JOIN users u ON dr.user_id = u.id
      JOIN deals d ON dr.deal_id = d.id
      WHERE d.businessId = ? AND dr.status = 'approved'
      ORDER BY dr.redeemed_at DESC
      LIMIT 10
    `;

    const redemptionResults = await queryAsync(recentRedemptionsQuery, [merchant.businessId]);

    // Get upgrade suggestions if merchant is near limit
    let upgradeOptions = [];
    if (!merchant.canPostDeals || (merchant.dealLimit > 0 && merchant.actualDealsThisMonth >= merchant.dealLimit * 0.8)) {
      const upgradeQuery = `
        SELECT name, \`key\`, price, currency, max_deals_per_month as dealPostingLimit, features
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
          membershipLevel: merchant.membershipType, // Use membershipType from users table
          status: merchant.status, // Use status from users table
          socialMediaFollowed: merchant.businessSocial,
          customDealLimit: merchant.customDealLimit,
          planExpiryDate: merchant.planExpiryDate,
          businessCreatedAt: merchant.businessCreatedAt
        },
        user: {
          id: merchant.id,
          fullName: merchant.fullName,
          email: merchant.email,
          membershipType: merchant.membershipType, // Single source of truth for plan
          status: merchant.status,
          userType: merchant.userType,
          statusUpdatedAt: merchant.statusUpdatedAt,
          statusUpdatedBy: merchant.statusUpdatedBy
        },
        plan: {
          key: merchant.membershipType || 'basic', // Use membershipType from users table
          name: merchant.planName || 'Basic Business',
          description: merchant.planDescription || 'Basic business plan with standard features',
          dealPostingLimit: merchant.dealLimit,
          priority: merchant.planPriority || 1,
          price: merchant.planPrice || 0,
          currency: 'GHS',
          billingCycle: merchant.billingCycle || 'monthly',
          features: (() => {
            const pf = merchant.planFeatures;
            if (pf === null || pf === undefined) return [];
            if (Array.isArray(pf)) return pf;
            if (typeof pf === 'string') {
              try {
                const parsed = JSON.parse(pf);
                if (Array.isArray(parsed)) return parsed;
                return pf.split(',').map(s => s.trim()).filter(Boolean);
              } catch (e) {
                return pf.split(',').map(s => s.trim()).filter(Boolean);
              }
            }
            if (typeof pf === 'object') {
              // If it's an object, return its stringified values or keys
              try {
                return Object.values(pf).map(v => String(v));
              } catch (e) {
                return Object.keys(pf);
              }
            }
            return [];
          })()
        },
        upgradeOptions: upgradeOptions.length > 0 ? upgradeOptions : null
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

// Get pending redemption requests for merchant - MOVED UP for priority
router.get('/redemption-requests', checkMerchantAccess, async (req, res) => {
  try {
    const merchant = req.merchant;
    
    console.log('[DEBUG BACKEND] Fetching redemption requests for merchant:', merchant.businessId);
    console.log('[DEBUG BACKEND] Merchant object:', { 
      id: merchant.id, 
      businessId: merchant.businessId, 
      fullName: merchant.fullName 
    });
    
    if (!(await tableExists('deal_redemptions'))) {
      console.log('[DEBUG BACKEND] Redemptions table not found');
      return res.json({
        success: true,
        requests: [],
        message: 'Redemptions table not found'
      });
    }

    // Use the same pattern as analytics but filter for pending status
    // This mirrors the successful analytics approach
    const query = `
      SELECT 
        dr.id,
        dr.deal_id,
        dr.user_id,
        dr.redeemed_at,
        dr.status,
        dr.rejection_reason,
        d.title as dealTitle,
        d.discount,
        d.discountType,
        u.fullName as userName,
        u.phone,
        u.membershipNumber
      FROM deal_redemptions dr
      JOIN deals d ON dr.deal_id = d.id
      JOIN users u ON dr.user_id = u.id
      WHERE d.businessId = ? AND dr.status = 'pending'
      ORDER BY dr.redeemed_at DESC
    `;
    
    console.log('[DEBUG BACKEND] Executing query with businessId:', merchant.businessId);
    
    const results = await queryAsync(query, [merchant.businessId]);
    
    console.log('[DEBUG BACKEND] Pending redemptions found:', results.length);
    console.log('[DEBUG BACKEND] Redemption details:', results);
    
    res.json({
      success: true,
      requests: results,
      count: results.length
    });
  } catch (err) {
    console.error('[DEBUG BACKEND] Error fetching redemption requests:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching redemption requests',
      error: err.message
    });
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
  body('discountType').isIn(['percentage', 'fixed', 'bogo', 'other']).withMessage('Invalid discount type'),
  body('memberLimit').optional().custom((value) => {
    // Allow empty string, null, or undefined
    if (!value || value === '' || value === null || value === undefined) {
      return true;
    }
    // If value is provided, it must be a positive integer
    const num = parseInt(value);
    if (isNaN(num) || num < 1) {
      throw new Error('Member limit must be a positive integer');
    }
    return true;
  }),
  body('expiration_date').isISO8601().withMessage('Valid expiration date is required')
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
    requiredPlanPriority,
    bannerImage,  // Add this field
    memberLimit,   // Add memberLimit field
    applicableLocations  // Add this field
  } = req.body;

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
    (businessId, title, description, category, discount, discountType, originalPrice, discountedPrice, termsConditions, validFrom, validUntil, couponCode, requiredPlanPriority, bannerImage, member_limit, applicableLocations, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval')
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
    requiredPlanPriority || 1,
    bannerImage || null,  // Add bannerImage value
    memberLimit || null,   // Add memberLimit value
    applicableLocations && applicableLocations.trim() !== '' ? applicableLocations.trim() : null  // Add applicableLocations value
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

    // Log deal creation activity
    try {
      logActivity('NEW_DEAL_POSTED', {
        userId: req.merchant.id,
        description: `New deal posted: "${title}" by ${merchant.businessName || 'merchant'}`,
        relatedId: result.insertId,
        relatedType: 'deal',
        metadata: {
          dealId: result.insertId,
          dealTitle: title,
          businessId: merchant.businessId,
          businessName: merchant.businessName,
          discount: discount,
          discountType: discountType
        }
      });
    } catch (logError) {
      console.warn('Failed to log deal creation activity:', logError);
    }

    // TODO: Send notification to admin about new deal pending approval

    // Send notifications about new deal creation
    NotificationHooks.onDealCreated(result.insertId, {
      title: title,
      description: description,
      businessName: merchant.businessName || 'Business',
      discount: discount,
      discountType: discountType,
      expiryDate: expiration_date
    }).then(emailResult => {
      console.log('📧 Deal creation emails sent to users:', emailResult);
    }).catch(emailError => {
      console.error('📧 Failed to send deal creation emails:', emailError);
    });

    res.status(201).json({ 
      success: true,
      message: 'Deal created successfully and is pending admin approval',
      dealId: result.insertId
    });
  });
});

// Update deal (only for pending_approval or rejected deals)
// Update deal (allow for pending_approval, rejected, or active deals)
router.put('/deals/:dealId', checkMerchantAccess, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('discount').isNumeric().withMessage('Valid discount amount is required'),
  body('memberLimit').optional().custom((value) => {
    // Allow empty string, null, or undefined
    if (!value || value === '' || value === null || value === undefined) {
      return true;
    }
    // If value is provided, it must be a positive integer
    const num = parseInt(value);
    if (isNaN(num) || num < 1) {
      throw new Error('Member limit must be a positive integer');
    }
    return true;
  }),
  body('originalPrice').optional().isNumeric().withMessage('Valid original price is required'),
  body('discountedPrice').optional().isNumeric().withMessage('Valid discounted price is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }

  try {
    const merchant = req.merchant;
    const dealId = parseInt(req.params.dealId);
    const {
      title,
      description,
      category,
      discount,
      discountType = 'percentage',
      originalPrice,
      discountedPrice,
      termsConditions,
      expiration_date,
      couponCode,
      requiredPlanPriority,
      bannerImage,  // Add this field
      memberLimit,   // Add memberLimit field
      applicableLocations  // Add this field
    } = req.body;

    if (!dealId || isNaN(dealId)) {
      return res.status(400).json({ success: false, message: 'Valid deal ID is required' });
    }

    // Check if deal exists and belongs to this merchant
    console.log(`[DEBUG] Checking deal ${dealId} for merchant businessId: ${merchant.businessId}`);
    const checkQuery = `
      SELECT id, status, title, businessId FROM deals 
      WHERE id = ?
    `;
    
    const existingDeal = await queryAsync(checkQuery, [dealId]);
    console.log(`[DEBUG] Deal found:`, existingDeal[0]);
    
    if (existingDeal.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Deal not found.' 
      });
    }

    // Check if deal belongs to this merchant
    if (existingDeal[0].businessId !== merchant.businessId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to edit this deal. This deal belongs to a different business.' 
      });
    }

    // Check if deal status allows editing (allow all statuses now)
    const allowedStatuses = ['pending_approval', 'rejected', 'active', 'inactive', 'expired'];
    if (!allowedStatuses.includes(existingDeal[0].status)) {
      return res.status(403).json({ 
        success: false, 
        message: `Deal with status '${existingDeal[0].status}' cannot be edited.` 
      });
    }

    // Convert required plan priority to minPlanPriority
    const minPlanPriority = requiredPlanPriority ? parseInt(requiredPlanPriority) : null;

    // Update the deal while preserving the original status (do not change status on edit)
    const newStatus = existingDeal[0].status;
    const updateQuery = `
      UPDATE deals SET 
        title = ?, 
        description = ?, 
        category = ?, 
        discount = ?, 
        discountType = ?,
        originalPrice = ?, 
        discountedPrice = ?, 
        termsConditions = ?, 
        expiration_date = ?, 
        couponCode = ?,
        minPlanPriority = ?,
        bannerImage = ?,
        member_limit = ?,
        applicableLocations = ?,
        status = ?,
        updated_at = NOW()
      WHERE id = ? AND businessId = ?
    `;

    const values = [
      title, 
      description, 
      category, 
      discount, 
      discountType,
      originalPrice || null, 
      discountedPrice || null, 
      termsConditions || null, 
      expiration_date || null, 
      couponCode || null,
      minPlanPriority,
      bannerImage || null,  // Add bannerImage value
      memberLimit || null,  // Add memberLimit value
      applicableLocations && applicableLocations.trim() !== '' ? applicableLocations.trim() : null,  // Add applicableLocations value
      newStatus,
      dealId,
      merchant.businessId
    ];

    const result = await queryAsync(updateQuery, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found or no changes made' });
    }

    res.json({ 
      success: true,
      message: 'Deal updated successfully',
      dealId: dealId,
      status: newStatus
    });
  } catch (err) {
    console.error('Update deal error:', err);
    res.status(500).json({ success: false, message: 'Server error updating deal' });
  }
});

// Delete deal (only for pending_approval or rejected deals)
// Delete deal (allow for pending_approval, rejected, or active deals)
router.delete('/deals/:dealId', checkMerchantAccess, async (req, res) => {
  try {
    const merchant = req.merchant;
    const dealId = parseInt(req.params.dealId);

    if (!dealId || isNaN(dealId)) {
      return res.status(400).json({ success: false, message: 'Valid deal ID is required' });
    }

    // Check if deal exists and belongs to this merchant
    console.log(`[DEBUG] Checking deal ${dealId} for deletion, merchant businessId: ${merchant.businessId}`);
    const checkQuery = `
      SELECT id, status, title, businessId FROM deals 
      WHERE id = ?
    `;
    
    const existingDeal = await queryAsync(checkQuery, [dealId]);
    console.log(`[DEBUG] Deal found for deletion:`, existingDeal[0]);
    
    if (existingDeal.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Deal not found.' 
      });
    }

    // Check if deal belongs to this merchant
    if (existingDeal[0].businessId !== merchant.businessId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to delete this deal. This deal belongs to a different business.' 
      });
    }

    // Check if deal status allows deletion (allow all statuses now)
    const allowedStatuses = ['pending_approval', 'rejected', 'active', 'inactive', 'expired'];
    if (!allowedStatuses.includes(existingDeal[0].status)) {
      return res.status(403).json({ 
        success: false, 
        message: `Deal with status '${existingDeal[0].status}' cannot be deleted.` 
      });
    }

    // Delete related redemptions first (if any)
    if (await tableExists('deal_redemptions')) {
      await queryAsync('DELETE FROM deal_redemptions WHERE deal_id = ?', [dealId]);
    }

    // Delete the deal
    const deleteResult = await queryAsync('DELETE FROM deals WHERE id = ? AND businessId = ?', [dealId, merchant.businessId]);

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    res.json({ 
      success: true,
      message: `Deal "${existingDeal[0].title}" deleted successfully`
    });
  } catch (err) {
    console.error('Delete deal error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting deal' });
  }
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
    
    // Return updated business info
    const updatedBusiness = {
      businessId: merchant.businessId,
      businessName,
      businessDescription,
      businessCategory,
      businessAddress,
      businessPhone,
      businessEmail,
      website
    };
    
    res.json({ 
      success: true, 
      message: 'Business profile updated successfully',
      business: updatedBusiness 
    });
  });
});

// Get merchant business information for certificates
router.get('/business-info', checkMerchantAccess, async (req, res) => {
  try {
    const merchant = req.merchant;

    // Format business information for certificate display
    const businessInfo = {
      // Business Details
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
      
      // Personal Details (Owner/Contact)
      ownerName: merchant.fullName,
      ownerEmail: merchant.email,
      ownerPhone: merchant.phone,
      bloodGroup: merchant.bloodGroup,
      
      // Membership Details
      membershipNumber: `BIZ-${merchant.businessId.toString().padStart(6, '0')}`,
      membershipLevel: merchant.membershipType || 'basic_business', // Use membershipType from users table
      membershipType: merchant.membershipType || 'basic_business',
      planName: merchant.planName || 'Basic Business',
      
      // Status and Verification
      status: merchant.status,
      isVerified: merchant.isVerified,
      verificationDate: merchant.verificationDate,
      registrationDate: merchant.businessCreatedAt || merchant.created_at,
      
      // Certificate Details
      certificateNumber: `CERT-${merchant.businessId}-${new Date().getFullYear()}`,
      issueDate: new Date().toISOString().split('T')[0],
      validityPeriod: merchant.planExpiryDate || 'Ongoing',
      
      // QR Code and Barcode data
      qrCodeData: JSON.stringify({
        type: 'business_verification',
        businessId: merchant.businessId,
        businessName: merchant.businessName,
        membershipNumber: `BIZ-${merchant.businessId.toString().padStart(6, '0')}`,
        verificationUrl: `https://indiansinghana.com/verify/business/${merchant.businessId}`,
        issuedAt: new Date().toISOString()
      }),
      barcodeData: `BIZ${merchant.businessId.toString().padStart(8, '0')}`,
      
      // Additional Certificate Information
      communityName: 'Indians in Ghana',
      authoritySignature: 'Community Administration',
      certificateType: 'Business Membership Certificate',
      validationNote: 'This certificate validates the business membership in the Indians in Ghana community.'
    };

    res.json({ 
      success: true, 
      businessInfo 
    });
  } catch (error) {
    console.error('Business info error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching business information' 
    });
  }
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
router.get('/analytics/deals/:dealId?', checkMerchantAccess, async (req, res) => {
  try {
    const merchant = req.merchant;
    const dealId = req.params.dealId;

    if (dealId) {
      // Enhanced analytics for specific deal
      const dealQuery = `
        SELECT d.*, 
               COALESCE(d.views, 0) as views,
               COALESCE(d.redemptions, 0) as redemptions,
               (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id) as actualRedemptions,
               (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND dr.status = 'approved') as approvedRedemptions,
               (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND dr.status = 'pending') as pendingRedemptions,
               (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND dr.status = 'rejected') as rejectedRedemptions,
               (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND dr.status = 'approved' AND DATE(dr.redeemed_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as monthlyRedemptions,
               (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND dr.status = 'approved' AND DATE(dr.redeemed_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as weeklyRedemptions,
               (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND dr.status = 'approved' AND DATE(dr.redeemed_at) = CURDATE()) as todayRedemptions
        FROM deals d
        WHERE d.id = ? AND d.businessId = ?
      `;
      
      const dealResults = await queryAsync(dealQuery, [dealId, merchant.businessId]);
      
      if (!dealResults.length) {
        return res.status(404).json({ 
          success: false, 
          message: 'Deal not found or not accessible' 
        });
      }

      // Get detailed redemption list with user information
      const redemptionsQuery = `
        SELECT 
          dr.id,
          dr.redeemed_at as redemption_date,
          dr.status,
          dr.rejection_reason,
          u.fullName as user_name,
          u.membershipNumber,
          u.phone as user_phone,
          p.name as user_plan,
          p.priority as user_priority
        FROM deal_redemptions dr
        JOIN users u ON dr.user_id = u.id
        LEFT JOIN plans p ON u.membershipType = p.key AND p.type = 'user'
        WHERE dr.deal_id = ?
        ORDER BY dr.redeemed_at DESC
        LIMIT 100
      `;

      const redemptions = await queryAsync(redemptionsQuery, [dealId]);

      // Calculate conversion rate
      const deal = dealResults[0];
      const conversionRate = deal.views > 0 ? ((deal.actualRedemptions / deal.views) * 100).toFixed(2) : 0;

      res.json({ 
        success: true, 
        deal: {
          ...deal,
          conversionRate: parseFloat(conversionRate)
        },
        redemptions,
        stats: {
          totalViews: deal.views,
          totalRedemptions: deal.actualRedemptions,
          approvedRedemptions: deal.approvedRedemptions,
          pendingRedemptions: deal.pendingRedemptions,
          rejectedRedemptions: deal.rejectedRedemptions,
          monthlyRedemptions: deal.monthlyRedemptions,
          weeklyRedemptions: deal.weeklyRedemptions,
          todayRedemptions: deal.todayRedemptions,
          conversionRate: parseFloat(conversionRate)
        }
      });
    } else {
      // Enhanced analytics for all deals
      const dealsQuery = `
        SELECT 
          d.id, 
          d.title, 
          d.status,
          d.category,
          d.created_at,
          d.expiration_date,
          COALESCE(d.views, 0) as views, 
          COALESCE(d.redemptions, 0) as redemptions,
          d.originalPrice,
          d.discountedPrice,
          (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id) as actualRedemptions,
          (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND dr.status = 'approved') as approvedRedemptions,
          (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND dr.status = 'pending') as pendingRedemptions
        FROM deals d
        WHERE d.businessId = ?
        ORDER BY d.created_at DESC
      `;
      
      const deals = await queryAsync(dealsQuery, [merchant.businessId]);

      // Calculate summary statistics - only count approved redemptions
      const totalViews = deals.reduce((sum, deal) => sum + deal.views, 0);
      const totalRedemptions = deals.reduce((sum, deal) => sum + deal.approvedRedemptions, 0);

      res.json({ 
        success: true, 
        deals: deals.map(deal => ({
          ...deal,
          conversionRate: deal.views > 0 ? ((deal.approvedRedemptions / deal.views) * 100).toFixed(2) : 0
        })),
        summary: {
          totalDeals: deals.length,
          totalViews,
          totalRedemptions,
          averageConversion: totalViews > 0 ? ((totalRedemptions / totalViews) * 100).toFixed(2) : 0
        }
      });
    }
  } catch (err) {
    console.error('Analytics query error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching analytics' 
    });
  }
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

// Approve redemption request
router.patch('/redemption-requests/:requestId/approve', checkMerchantAccess, async (req, res) => {
  try {
    const merchant = req.merchant;
    const requestId = parseInt(req.params.requestId);

    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({ success: false, message: 'Valid request ID is required' });
    }

    // Defensive: Check if deal_redemptions table exists
    if (!(await tableExists('deal_redemptions'))) {
      return res.status(500).json({ success: false, message: 'deal_redemptions table missing' });
    }
    // Defensive: Check if deals table exists
    if (!(await tableExists('deals'))) {
      return res.status(500).json({ success: false, message: 'deals table missing' });
    }

    // Verify request belongs to merchant's deals and is pending
    const checkQuery = `
      SELECT dr.*, d.title, d.businessId, d.id as deal_id
      FROM deal_redemptions dr
      JOIN deals d ON dr.deal_id = d.id
      WHERE dr.id = ? AND d.businessId = ? AND dr.status = 'pending'
    `;

    const checkResults = await queryAsync(checkQuery, [requestId, merchant.businessId]);

    if (checkResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Redemption request not found or already processed'
      });
    }

    const dealId = checkResults[0].deal_id;
    if (!dealId) {
      return res.status(500).json({ success: false, message: 'Deal ID missing for redemption request' });
    }

    // Update request status to approved
    // Use approved_at to track approval timestamp (change from updated_at)
    const updateRes = await queryAsync(
      'UPDATE deal_redemptions SET status = "approved", approved_at = NOW() WHERE id = ?',
      [requestId]
    );
    if (updateRes.affectedRows === 0) {
      return res.status(500).json({ success: false, message: 'Failed to update redemption request status' });
    }

    // Update deal redemption count
    const dealUpdateRes = await queryAsync('UPDATE deals SET redemptions = redemptions + 1 WHERE id = ?', [dealId]);
    if (dealUpdateRes.affectedRows === 0) {
      return res.status(500).json({ success: false, message: 'Failed to update deal redemption count' });
    }

    // Check if deal has reached member limit and auto-expire if needed
    try {
      const dealResult = await queryAsync('SELECT member_limit FROM deals WHERE id = ?', [dealId]);
      if (dealResult.length > 0 && dealResult[0].member_limit) {
        const memberLimit = dealResult[0].member_limit;
        
        // Count unique users who have approved redemptions for this deal
        const uniqueUserResult = await queryAsync(
          'SELECT COUNT(DISTINCT user_id) as uniqueUsers FROM deal_redemptions WHERE deal_id = ? AND status = "approved"', 
          [dealId]
        );
        
        const uniqueUsers = uniqueUserResult[0]?.uniqueUsers || 0;
        
        // If member limit reached, auto-expire the deal
        if (uniqueUsers >= memberLimit) {
          await queryAsync('UPDATE deals SET status = "expired" WHERE id = ?', [dealId]);
          console.log(`Deal ${dealId} auto-expired: reached member limit of ${memberLimit} users`);
        }
      }
    } catch (limitError) {
      console.error('Error checking member limit for deal:', limitError);
      // Don't fail the approval if member limit check fails
    }

    // Update user's monthly redemption count
    const notificationService = require('../services/notificationService');
    try {
      await notificationService.incrementUserRedemptionCount(checkResults[0].user_id, new Date());
    } catch (countError) {
      console.error('Failed to update user redemption count:', countError);
    }

    // Send redemption approval notification
    const redemptionData = checkResults[0];
    
    // Log redemption approval activity
    try {
      await logActivity('ACCEPTING_DEAL_REDEMPTION_BY', {
        userId: req.merchant.id, // Merchant who approved
        description: `Accepting deal redemption by ${merchant.businessName || 'merchant'} for customer ${redemptionData.fullName}`,
        relatedId: dealId,
        relatedType: 'deal',
        metadata: {
          redemptionId: requestId,
          dealId: dealId,
          dealTitle: redemptionData.title,
          customerId: redemptionData.user_id,
          customerName: redemptionData.fullName,
          merchantId: req.merchant.id,
          businessName: merchant.businessName
        }
      });
    } catch (logError) {
      console.warn('Failed to log redemption approval activity:', logError);
    }
    
    NotificationHooks.onRedemptionResponse(requestId, 'approved', {
      userId: redemptionData.user_id,
      dealTitle: redemptionData.title,
      businessName: merchant.businessName || 'Business',
      redemptionDate: new Date().toLocaleDateString()
    }).then(emailResult => {
      console.log('📧 Redemption approval email sent:', emailResult);
    }).catch(emailError => {
      console.error('📧 Failed to send redemption approval email:', emailError);
    });

    res.json({
      success: true,
      message: 'Redemption request approved successfully!'
    });
  } catch (err) {
    console.error('Error approving redemption request:', err);
    res.status(500).json({
      success: false,
      message: 'Server error approving redemption request',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Reject redemption request
router.patch('/redemption-requests/:requestId/reject', checkMerchantAccess, async (req, res) => {
  try {
    const merchant = req.merchant;
    const requestId = parseInt(req.params.requestId);
    const { reason } = req.body;
    
    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({ success: false, message: 'Valid request ID is required' });
    }

    // Verify request belongs to merchant's deals and is pending
    const checkQuery = `
      SELECT dr.*, d.title, d.businessId
      FROM deal_redemptions dr
      JOIN deals d ON dr.deal_id = d.id
      WHERE dr.id = ? AND d.businessId = ? AND dr.status = 'pending'
    `;
    
    const checkResults = await queryAsync(checkQuery, [requestId, merchant.businessId]);
    
    if (checkResults.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Redemption request not found or already processed' 
      });
    }

    // Use rejected_at to track rejection timestamp (change from updated_at)
    let updateQuery = 'UPDATE deal_redemptions SET status = "rejected", rejected_at = NOW()';
    let params = [requestId];

    if (reason && reason.trim()) {
      updateQuery += ', rejection_reason = ? WHERE id = ?';
      params = [reason.trim(), requestId];
    } else {
      updateQuery += ' WHERE id = ?';
    }

    await queryAsync(updateQuery, params);

    // Log redemption rejection activity
    try {
      const redemptionData = checkResults[0];
      await logActivity('REJECTED_DEAL_REDEMPTION_BY', {
        userId: req.merchant.id, // Merchant who rejected
        description: `Rejected deal redemption by ${merchant.businessName || 'merchant'} - Invalid membership`,
        relatedId: redemptionData.deal_id,
        relatedType: 'deal',
        metadata: {
          redemptionId: requestId,
          dealId: redemptionData.deal_id,
          dealTitle: redemptionData.title,
          customerId: redemptionData.user_id,
          customerName: redemptionData.fullName,
          merchantId: req.merchant.id,
          businessName: merchant.businessName,
          rejectionReason: reason?.trim() || 'No reason provided'
        }
      });
    } catch (logError) {
      console.warn('Failed to log redemption rejection activity:', logError);
    }

    // Send redemption rejection notification
    const redemptionData = checkResults[0];
    NotificationHooks.onRedemptionResponse(requestId, 'rejected', {
      userId: redemptionData.user_id,
      dealTitle: redemptionData.title,
      businessName: merchant.businessName || 'Business',
      reason: reason?.trim() || 'No reason provided',
      redemptionDate: new Date().toLocaleDateString()
    }).then(emailResult => {
      console.log('📧 Redemption rejection email sent:', emailResult);
    }).catch(emailError => {
      console.error('📧 Failed to send redemption rejection email:', emailError);
    });

    res.json({
      success: true,
      message: 'Redemption request rejected'
    });
  } catch (err) {
    console.error('Error rejecting redemption request:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error rejecting redemption request'
    });
  }
});

// Verify member by membership number
router.get('/verify-member/:membershipNumber', checkMerchantAccess, async (req, res) => {
  try {
    const membershipNumber = req.params.membershipNumber;
    
    if (!membershipNumber || !membershipNumber.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Membership number is required' 
      });
    }

    // Check if users and plans tables exist
    if (!(await tableExists('users'))) {
      return res.status(500).json({ 
        success: false, 
        message: 'Users table not found' 
      });
    }
    if (!(await tableExists('plans'))) {
      return res.status(500).json({ 
        success: false, 
        message: 'Plans table not found' 
      });
    }

    // Query to find member by membership number
    const memberQuery = `
      SELECT 
        u.id,
        u.fullName,
        u.email,
        u.phone,
        u.membershipNumber,
        u.membershipType,
        u.status,
        u.created_at,
        u.validationDate,
        p.name as planName,
        p.priority as planPriority
      FROM users u
      LEFT JOIN plans p ON u.membershipType = p.key AND p.type = 'user'
      WHERE u.membershipNumber = ?
      LIMIT 1
    `;

    let memberResults;
    try {
      memberResults = await queryAsync(memberQuery, [membershipNumber]);
    } catch (sqlError) {
      console.error('SQL error verifying member:', sqlError);
      return res.status(500).json({
        success: false,
        message: 'Database error verifying member',
        error: process.env.NODE_ENV === 'development' ? sqlError.message : undefined
      });
    }

    if (memberResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No member found with this membership number'
      });
    }

    const member = memberResults[0];

    // Format the response
    const memberInfo = {
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      membershipNumber: member.membershipNumber,
      membershipType: member.membershipType,
      status: member.status,
      registrationDate: member.created_at,
      validationDate: member.validationDate,
      planName: member.planName,
      planPriority: member.planPriority,
      // Calculate plan status
      isExpired: member.validationDate ? new Date(member.validationDate) < new Date() : false,
      daysUntilExpiry: member.validationDate ? Math.ceil((new Date(member.validationDate) - new Date()) / (1000 * 60 * 60 * 24)) : null
    };

    res.json({
      success: true,
      member: memberInfo,
      message: 'Member found successfully'
    });

  } catch (err) {
    console.error('Error verifying member:', err);
    res.status(500).json({
      success: false,
      message: 'Server error verifying member',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
