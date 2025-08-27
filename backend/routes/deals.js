const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

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
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Check user access based on plan and deal requirements
const checkDealAccess = async (req, res, next) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Get user details with current plan info
    const userQuery = `
      SELECT u.*, p.priority, p.dealAccess, p.maxDealRedemptions as maxRedemptions, p.name as planName
      FROM users u
      LEFT JOIN plans p ON u.membershipType = p.key AND p.type = 'user'
      WHERE u.id = ?
    `;

    const userResult = await queryAsync(userQuery, [userId]);

    if (!userResult.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult[0];

    // Check user status
    if (user.status === 'pending') {
      return res.status(403).json({ 
        message: 'Your profile is not yet accepted by the admin.',
        statusCheck: 'pending'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ 
        message: 'Your profile is temporarily suspended by admin.',
        statusCheck: 'suspended'
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ 
        message: 'Your profile is rejected by admin.',
        statusCheck: 'rejected'
      });
    }

    // Check plan expiry
    if (user.validationDate && new Date(user.validationDate) < new Date()) {
      return res.status(403).json({ 
        message: 'Your plan has expired. Please renew to access deals.',
        statusCheck: 'expired',
        planExpiryDate: user.validationDate,
        upgradeRequired: true
      });
    }

    // Check redemption limits for the current month

    if (user.maxRedemptions && user.maxRedemptions > 0) {
      // YYYY-MM format
      const currentMonth = new Date().toISOString().slice(0, 7);
      const redemptionsThisMonth = await queryAsync(
        `SELECT COUNT(*) as count 
         FROM deal_redemptions 
         WHERE user_id = ? AND DATE_FORMAT(redeemed_at, '%Y-%m') = ? AND status = 'approved'`,
        [userId, currentMonth]
      );

      const redemptionLimit = user.customRedemptionLimit || user.maxRedemptions;
      
      if (redemptionsThisMonth[0].count >= redemptionLimit) {
        return res.status(403).json({ 
          message: `You have reached your monthly redemption limit of ${redemptionLimit}. Please upgrade your plan for more deals.`,
          statusCheck: 'limit_reached',
          redemptionsUsed: redemptionsThisMonth[0].count,
          redemptionLimit: redemptionLimit,
          upgradeRequired: true
        });
      }

      user.redemptionsUsed = redemptionsThisMonth[0].count;
      user.redemptionLimit = redemptionLimit;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('User access check error:', error);
    return res.status(500).json({ message: 'Server error checking user access' });
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

// Get all deals with plan-based filtering
router.get('/', async (req, res) => {
  try {
    // First, update expired deals to have status 'expired'
    await updateExpiredDeals();
    
    // Simplified query to show all active and non-expired deals to everyone
    const dealsQuery = `
      SELECT d.*, b.businessName, b.businessCategory, b.businessAddress,
             b.businessPhone, b.businessEmail, b.website
      FROM deals d
      LEFT JOIN businesses b ON d.businessId = b.businessId
      WHERE d.status = 'active'
        AND (d.validUntil IS NULL OR d.validUntil >= CURDATE())
        AND (d.expiration_date IS NULL OR d.expiration_date >= CURDATE())
      ORDER BY d.created_at DESC
    `;

    const deals = await queryAsync(dealsQuery);

    // Increment view count for each deal (with error handling)
    if (deals.length > 0) {
      const dealIds = deals.map(deal => deal.id);
      try {
        await queryAsync('UPDATE deals SET views = COALESCE(views, 0) + 1 WHERE id IN (?)', [dealIds]);
      } catch (viewError) {
        console.log('View count update failed:', viewError.message);
      }
    }

    // Format the deals data
    const formattedDeals = deals.map(deal => ({
      ...deal,
      // Ensure we have a valid expiration date
      expirationDate: deal.validUntil || deal.expiration_date,
      // Calculate savings if we have both prices
      savings: deal.originalPrice && deal.discountedPrice ? 
               (deal.originalPrice - deal.discountedPrice).toFixed(2) : null,
      // Calculate percentage discount
      discountPercentage: deal.originalPrice && deal.discountedPrice ?
                         Math.round(((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100) : null
    }));

    const response = {
      success: true,
      deals: formattedDeals,
      total: formattedDeals.length
    };

    res.json(response);
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({ message: 'Server error fetching deals' });
  }
});

// Get all public deals (no authentication required) - MUST be before /:id route
router.get('/public', async (req, res) => {
  try {
    // Simple query to get all active and non-expired deals for public viewing
    const dealsQuery = `
      SELECT d.id, d.businessId, d.title, d.description, d.category, d.discount, 
             d.discountType, d.originalPrice, d.discountedPrice, d.bannerImage,
             d.validFrom, d.validUntil, d.expiration_date, d.status, d.created_at,
             d.termsConditions, d.views, d.redemptions, d.minPlanPriority,
             b.businessName, b.businessCategory, b.businessAddress, b.businessPhone,
             b.businessEmail, b.website
      FROM deals d
      LEFT JOIN businesses b ON d.businessId = b.businessId
      WHERE d.status = 'active'
        AND (d.validUntil IS NULL OR d.validUntil >= CURDATE())
        AND (d.expiration_date IS NULL OR d.expiration_date >= CURDATE())
      ORDER BY d.created_at DESC
    `;

    const deals = await queryAsync(dealsQuery);

    // Format the deals data
    const formattedDeals = deals.map(deal => ({
      ...deal,
      // Ensure we have a valid expiration date
      expirationDate: deal.validUntil || deal.expiration_date,
      // Calculate savings if we have both prices
      savings: deal.originalPrice && deal.discountedPrice ? 
               (deal.originalPrice - deal.discountedPrice).toFixed(2) : null,
      // Calculate percentage discount
      discountPercentage: deal.originalPrice && deal.discountedPrice ?
                         Math.round(((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100) : null
    }));

    res.json({ 
      success: true, 
      deals: formattedDeals,
      total: formattedDeals.length
    });
  } catch (error) {
    console.error('Get public deals error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching deals',
      deals: []
    });  }
});

// Get home page statistics (public endpoint) - MUST be before /:id route
router.get('/home-stats', async (req, res) => {
  try {
    // Get basic home page statistics - simplified version
    let totalUsers = 0, totalBusinesses = 0, totalDeals = 0, totalRedemptions = 0;
    
    try {
      const userCount = await queryAsync('SELECT COUNT(*) as count FROM users');
      totalUsers = userCount[0]?.count || 0;
    } catch (e) { console.log('Users table error:', e.message); }
    
    try {
      const businessCount = await queryAsync('SELECT COUNT(*) as count FROM businesses');
      totalBusinesses = businessCount[0]?.count || 0;
    } catch (e) { console.log('Businesses table error:', e.message); }
    
    try {
      const dealCount = await queryAsync(`
        SELECT COUNT(*) as count FROM deals
        WHERE status = 'active'
          AND (validUntil IS NULL OR validUntil >= CURDATE())
          AND (expiration_date IS NULL OR expiration_date >= CURDATE())
      `);
      totalDeals = dealCount[0]?.count || 0;
    } catch (e) { console.log('Deals table error:', e.message); }
    
    try {
      const redemptionCount = await queryAsync('SELECT COUNT(*) as count FROM deal_redemptions');
      totalRedemptions = redemptionCount[0]?.count || 0;
    } catch (e) { console.log('Deal redemptions table might not exist:', e.message); }
    
    const formattedStats = {
      totalUsers: totalUsers,
      totalBusinesses: totalBusinesses,
      totalDeals: totalDeals,
      totalRedemptions: totalRedemptions,
      uniqueRedeemers: 0, // Will add later when table exists
      totalMerchants: Math.floor(totalUsers * 0.3), // Rough estimate
      totalMembers: Math.floor(totalUsers * 0.7), // Rough estimate
      avgDiscountPercentage: 15, // Default
      totalViews: totalDeals * 50, // Rough estimate
      engagementRate: totalUsers > 0 ? Math.round((totalRedemptions / totalUsers) * 100) : 0
    };
    
    res.json({
      success: true,
      stats: formattedStats
    });
  } catch (error) {
    console.error('Get home stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching home page statistics',
      stats: {
        totalUsers: 0,
        totalBusinesses: 0,
        totalDeals: 0,
        totalRedemptions: 0,
        uniqueRedeemers: 0,
        totalMerchants: 0,
        totalMembers: 0,
        avgDiscountPercentage: 0,
        totalViews: 0,
        engagementRate: 0
      }
    });
  }
});

// Get specific deal with access check
router.get('/:id', checkDealAccess, async (req, res) => {
  try {
    const user = req.user;
    const dealId = req.params.id;
    const userPriority = user.priority || 1;

    const dealQuery = `
      SELECT d.*, b.businessName, b.businessCategory, b.businessAddress, b.businessPhone, b.businessEmail,
             p.name as requiredPlanName, p.priority as requiredPriority
      FROM deals d
      JOIN businesses b ON d.businessId = b.businessId
      LEFT JOIN plans p ON d.requiredPlanPriority = p.priority AND p.type = 'user'
      WHERE d.id = ?
    `;

    const dealResult = await queryAsync(dealQuery, [dealId]);

    if (!dealResult.length) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const d = dealResult[0];
    // Always return all expected fields with fallback values
    const deal = {
      id: d.id,
      businessId: d.businessId || '',
      title: d.title || '',
      description: d.description || '',
      category: d.category || '',
      discount: d.discount || '',
      discountType: d.discountType || '',
      discountedPrice: d.discountedPrice || '',
      originalPrice: d.originalPrice || '',
      bannerImage: d.bannerImage || '',
      validFrom: d.validFrom || '',
      validUntil: d.validUntil || '',
      expiration_date: d.expiration_date || '',
      status: d.status || '',
      created_at: d.created_at || '',
      termsConditions: d.termsConditions || '',
      views: d.views || 0,
      redemptions: d.redemptions || 0,
      minPlanPriority: d.minPlanPriority || 0,
      couponCode: d.couponCode || '',
      accessLevel: d.accessLevel || '',
      maxRedemptions: d.maxRedemptions || null,
      businessName: d.businessName || '',
      businessCategory: d.businessCategory || '',
      businessAddress: d.businessAddress || '',
      businessPhone: d.businessPhone || '',
      businessEmail: d.businessEmail || '',
      // Add any other fields as needed
      // ...
    };

    // Check if user can access this deal based on plan priority
    if (d.requiredPlanPriority && d.requiredPlanPriority > userPriority) {
      const requiredPlanQuery = `
        SELECT name, \`key\`, price, currency 
        FROM plans 
        WHERE priority >= ? AND type = 'user' AND isActive = 1
        ORDER BY priority ASC, price ASC
        LIMIT 1
      `;
      const requiredPlanResult = await queryAsync(requiredPlanQuery, [d.requiredPlanPriority]);

      return res.status(403).json({ 
        message: 'This deal requires a higher plan. Please upgrade to access this exclusive offer.',
        requiredPlanPriority: d.requiredPlanPriority,
        userPriority: userPriority,
        upgradeRequired: true,
        suggestedPlan: requiredPlanResult[0] || null
      });
    }
    // Check if deal is active and not expired
    if (d.status !== 'active') {
      return res.status(403).json({ message: 'This deal is not currently available' });
    }

    // Check expiration using both possible date columns
    const expirationDate = d.validUntil || d.expiration_date;
    if (expirationDate && new Date(expirationDate) < new Date()) {
      return res.status(403).json({ message: 'This deal has expired' });
    }

    // Increment view count
    await queryAsync('UPDATE deals SET views = views + 1 WHERE id = ?', [dealId]);

    res.json({ success: true, deal });
  } catch (error) {
    console.error('Get deal error:', error);
    res.status(500).json({ message: 'Server error fetching deal' });
  }
});

// Redeem a deal
router.post('/:id/redeem', checkDealAccess, (req, res) => {
  const user = req.user;
  const dealId = parseInt(req.params.id);
  const userId = user && user.id ? parseInt(user.id) : null;
  if (!userId || !dealId) {
    console.error('Redeem error: Missing userId or dealId', { userId, dealId });
    return res.status(400).json({ message: 'Invalid user or deal information' });
  }
  // First check if user has already redeemed this deal
  // Note: Allow multiple redemptions (changed requirement)
  db.query('SELECT * FROM deal_redemptions WHERE deal_id = ? AND user_id = ? AND status = "pending"', [dealId, userId], (err, pendingRedemptions) => {
    if (err) {
      console.error('Check redemption error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (pendingRedemptions.length > 0) {
      return res.status(400).json({ 
        message: 'You already have a pending redemption request for this deal. Please wait for merchant approval.',
        isPending: true
      });
    }
    // Check monthly redemption limit
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const monthlyLimitQuery = `
      SELECT COUNT(*) as redemptionsThisMonth
      FROM deal_redemptions
      WHERE user_id = ? AND DATE_FORMAT(redeemed_at, '%Y-%m') = ? AND status = 'approved'
    `;

    db.query(monthlyLimitQuery, [userId, currentMonth], (err2, limitResults) => {
      if (err2) {
        console.error('Monthly limit check error:', err2);
        return res.status(500).json({ message: 'Server error' });
      }

      const redemptionsThisMonth = limitResults[0]?.redemptionsThisMonth || 0;
      // Robust fallback for monthly limit fields
      let monthlyLimit = 0;
      if (user.customRedemptionLimit && !isNaN(user.customRedemptionLimit)) {
        monthlyLimit = parseInt(user.customRedemptionLimit);
      } else if (user.maxRedemptionsPerMonth && !isNaN(user.maxRedemptionsPerMonth)) {
        monthlyLimit = parseInt(user.maxRedemptionsPerMonth);
      } else if (user.maxRedemptions && !isNaN(user.maxRedemptions)) {
        monthlyLimit = parseInt(user.maxRedemptions);
      }

      if (monthlyLimit > 0 && redemptionsThisMonth >= monthlyLimit) {
        return res.status(403).json({ 
          message: `You have reached your monthly redemption limit of ${monthlyLimit}. Upgrade your plan for more redemptions.`,
          monthlyLimit,
          redemptionsUsed: redemptionsThisMonth
        });
      }      // Get deal details to verify it's still active
      db.query('SELECT * FROM deals WHERE id = ? AND status = "active"', [dealId], (err3, dealResults) => {
        if (err3) {
          console.error('Deal check error:', err3);
          return res.status(500).json({ message: 'Server error' });
        }

        if (!dealResults.length) {
          return res.status(404).json({ message: 'Deal not found or no longer active' });
        }

        const deal = dealResults[0];

        // Check if deal has expired (handle both expiration_date and validUntil)
        const expirationDate = deal.validUntil || deal.expiration_date;
        if (expirationDate && new Date(expirationDate) < new Date()) {
          return res.status(403).json({ message: 'This deal has expired' });
        }        // Check plan access based on deal priority - FIXED: Higher priority users (higher numbers) can access lower priority deals
        if (deal.minPlanPriority && (user.priority || 0) < deal.minPlanPriority) {
          // Get the required plan that can access this deal
          db.query('SELECT name, `key`, price, currency, features FROM plans WHERE priority >= ? AND type = "user" AND isActive = 1 ORDER BY priority ASC, price ASC LIMIT 1', 
            [deal.minPlanPriority], (planErr, planResults) => {
            
            let upgradeMessage = 'This deal requires a higher membership plan.';
            let suggestedPlan = null;
            
            if (!planErr && planResults.length > 0) {
              const requiredPlan = planResults[0];
              suggestedPlan = {
                name: requiredPlan.name,
                key: requiredPlan.key,
                price: requiredPlan.price,
                currency: requiredPlan.currency,
                features: requiredPlan.features ? requiredPlan.features.split(',') : []
              };
              upgradeMessage = `🔒 Upgrade Required! This exclusive deal is available for ${requiredPlan.name} members and above. Upgrade now starting at ${requiredPlan.currency} ${requiredPlan.price} to unlock this offer!`;
            } else {
              // Fallback to get higher priority plans if specific lookup fails
              db.query('SELECT name, `key`, price, currency FROM plans WHERE priority >= ? AND type = "user" AND isActive = 1 ORDER BY priority ASC LIMIT 3', 
                [deal.minPlanPriority], (fallbackErr, fallbackResults) => {
                
                if (!fallbackErr && fallbackResults.length > 0) {
                  const planOptions = fallbackResults.map(plan => plan.name).join(', ');
                  upgradeMessage = `🔒 Upgrade Required! This deal is available for ${planOptions} members. Upgrade your plan to access this exclusive offer!`;
                  suggestedPlan = {
                    name: fallbackResults[0].name,
                    key: fallbackResults[0].key,
                    price: fallbackResults[0].price,
                    currency: fallbackResults[0].currency
                  };
                }
                  return res.status(403).json({ 
                  message: upgradeMessage,
                  upgradeRequired: true,
                  currentPlanPriority: user.priority || 0,
                  requiredPlanPriority: deal.minPlanPriority,
                  suggestedPlan: suggestedPlan,
                  availablePlans: fallbackResults || []
                });
              });
              return;
            }
            
            return res.status(403).json({ 
              message: upgradeMessage,
              upgradeRequired: true,
              currentPlanPriority: user.priority || 0,
              requiredPlanPriority: deal.minPlanPriority,
              suggestedPlan: suggestedPlan
            });
          });
          return; // Exit early
        }

        // Check max redemptions for the deal
        if (deal.maxRedemptions) {
          db.query('SELECT COUNT(*) as totalRedemptions FROM deal_redemptions WHERE deal_id = ? AND status = "approved"', [dealId], (err4, countResults) => {
            if (err4) {
              console.error('Deal redemption count error:', err4);
              return res.status(500).json({ message: 'Server error' });
            }

            const totalRedemptions = countResults[0]?.totalRedemptions || 0;
            if (totalRedemptions >= deal.maxRedemptions) {
              return res.status(403).json({ message: 'This deal has reached its maximum redemption limit' });
            }

            // Proceed with redemption
            performRedemption();
          });
        } else {
          // No max redemption limit, proceed
          performRedemption();
        }

        function performRedemption() {
          // Generate redemption code
          const redemptionCode = `RDM${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

          // Insert redemption request with PENDING status - merchant approval required
          const insertQuery = 'INSERT INTO deal_redemptions (deal_id, user_id, redeemed_at, status) VALUES (?, ?, NOW(), "pending")';
          
          db.query(insertQuery, [dealId, userId], (err5, result) => {
            if (err5) {
              console.error('Redemption request insert error:', err5);
              return res.status(500).json({ message: 'Server error processing redemption request' });
            }

            // Get redemption ID and send notification to merchant
            const redemptionId = result.insertId;
            
            // Get merchant information from the deal's business
            db.query('SELECT userId FROM businesses WHERE businessId = ?', [deal.businessId], (merchantErr, merchantResults) => {
              if (!merchantErr && merchantResults.length > 0) {
                const merchantId = merchantResults[0].userId;
                
                // Send notification to merchant about the redemption request
                const NotificationHooks = require('../services/notificationHooks-integrated');
                NotificationHooks.onRedemptionRequested(redemptionId, {
                  merchantId: merchantId,
                  customerName: user.fullName,
                  dealTitle: deal.title,
                  membershipNumber: user.membershipNumber || `MEMBER${user.id}`,
                  customerEmail: user.email
                }).catch(err => {
                  console.error('Error sending redemption notification:', err);
                  // Don't fail the redemption if notification fails
                });
              } else {
                console.warn('Could not find merchant for deal:', deal.businessId);
              }
            });

            // Don't update deal redemption count yet - wait for merchant approval
            
            res.json({ 
              success: true, 
              message: '🎉 Redemption request submitted! The merchant will review your request and contact you for verification. You will be notified once approved.',
              isPending: true,
              requiresApproval: true,
              deal: {
                id: deal.id,
                title: deal.title,
                discount: deal.discount,
                discountType: deal.discountType
              }
            });
          });
        }
      });
    });
  });
});

// Get user's redeemed deals
router.get('/user/redeemed', checkDealAccess, (req, res) => {
  const userId = req.user.id;  const query = `
    SELECT dr.*, d.title, d.description, d.discount, d.discountType, b.businessName, b.businessAddress
    FROM deal_redemptions dr
    JOIN deals d ON dr.deal_id = d.id
    JOIN businesses b ON d.businessId = b.businessId
    WHERE dr.user_id = ?
    ORDER BY dr.redeemed_at DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Get redeemed deals error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    res.json({ success: true, redeemedDeals: results });
  });
});

// Get deal redemptions (for merchants and admins)
router.get('/:id/redemptions', auth, (req, res) => {
  const dealId = req.params.id;
  const userId = req.session.userId;

  // Check if user is admin or owns the business
  const authQuery = `
    SELECT u.adminRole, b.userId as businessUserId
    FROM users u
    LEFT JOIN deals d ON d.id = ?
    LEFT JOIN businesses b ON d.businessId = b.businessId
    WHERE u.id = ?
  `;

  db.query(authQuery, [dealId, userId], (err, authResults) => {
    if (err) {
      console.error('Auth check error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (!authResults.length) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const authResult = authResults[0];
    const isAdmin = authResult.adminRole !== null;
    const isOwner = authResult.businessUserId === userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }    // Get redemption details
    const redemptionsQuery = `
      SELECT dr.*, u.fullName, u.membershipNumber, u.email
      FROM deal_redemptions dr
      JOIN users u ON dr.user_id = u.id
      WHERE dr.deal_id = ?
      ORDER BY dr.redeemed_at DESC
    `;

    db.query(redemptionsQuery, [dealId], (err2, results) => {
      if (err2) {
        console.error('Get redemptions error:', err2);
        return res.status(500).json({ message: 'Server error' });
      }

      res.json({ success: true, redemptions: results });
    });
  });
});

// Get available upgrade plans for a user
router.get('/upgrade-plans/:userPriority', async (req, res) => {
  try {
    const userPriority = parseInt(req.params.userPriority) || 1;
    
    const upgradeQuery = `
      SELECT id, name, \`key\`, price, currency, features, priority, 
             maxDealRedemptions as maxRedemptions, dealAccess
      FROM plans 
      WHERE priority > ? AND type = 'user' AND isActive = 1
      ORDER BY priority ASC, price ASC
    `;
    
    const plans = await queryAsync(upgradeQuery, [userPriority]);
    
    const formattedPlans = plans.map(plan => ({
      ...plan,
      features: plan.features ? (typeof plan.features === 'string' ? plan.features.split(',') : plan.features) : []
    }));
    
    res.json({ 
      success: true, 
      upgradePlans: formattedPlans,
      currentPriority: userPriority
    });
  } catch (error) {
    console.error('Get upgrade plans error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching upgrade plans' 
    });
  }
});

// Get deals statistics (public endpoint)
router.get('/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as totalDeals,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeDeals,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactiveDeals,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expiredDeals,
        AVG(CASE WHEN originalPrice > 0 AND discountedPrice > 0 
          THEN ((originalPrice - discountedPrice) / originalPrice) * 100 
          ELSE 0 END) as avgDiscountPercentage,
        SUM(COALESCE(views, 0)) as totalViews,
        SUM(COALESCE(redemptions, 0)) as totalRedemptions
      FROM deals
    `;

    const [stats] = await queryAsync(statsQuery);
    
    res.json({
      success: true,
      stats: {
        ...stats,
        avgDiscountPercentage: Math.round(stats.avgDiscountPercentage || 0)
      }
    });
  } catch (error) {
    console.error('Get deals stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching deal statistics',
      stats: {
        totalDeals: 0,
        activeDeals: 0,
        inactiveDeals: 0,
        expiredDeals: 0,
        avgDiscountPercentage: 0,
        totalViews: 0,
        totalRedemptions: 0
      }
    });
  }
});

// Get available access levels based on current user plans
router.get('/access-levels', async (req, res) => {
  try {
    // Get all active plans ordered by priority
    const plansQuery = `
      SELECT id, name, \`key\`, priority, type, isActive
      FROM plans 
      WHERE isActive = 1 AND type = 'user'
      ORDER BY priority ASC, name ASC
    `;

    const plans = await queryAsync(plansQuery);

    const accessLevels = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      key: plan.key,
      priority: plan.priority,
      label: `${plan.name} (Priority ${plan.priority})`,
      description: `Users with ${plan.name} plan or higher priority plans can access this deal`
    }));

    res.json({ 
      success: true, 
      accessLevels,
      message: 'Access levels based on current user plans'
    });
  } catch (err) {
    console.error('Error fetching access levels:', err);
    res.status(500).json({ success: false, message: 'Server error fetching access levels' });
  }
});

module.exports = router;
