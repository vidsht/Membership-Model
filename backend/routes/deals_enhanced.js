const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const notificationService = require('../services/unifiedNotificationService');

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
const checkDealAccess = (req, res, next) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  // Get user details with current plan
  const userQuery = `
    SELECT u.*, p.priority, p.dealAccess, p.max_deals_per_month
    FROM users u
    LEFT JOIN plans p ON u.membershipType = p.key AND p.type = 'user'
    WHERE u.id = ?
  `;

  db.query(userQuery, [userId], (err, results) => {
    if (err) {
      console.error('User access check error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (!results.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];

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
    if (user.planExpiryDate && new Date(user.planExpiryDate) < new Date()) {
      return res.status(403).json({ 
        message: 'Your plan has expired. Please renew to access deals.',
        statusCheck: 'expired',
        planExpiryDate: user.planExpiryDate
      });
    }

    req.user = user;
    next();
  });
};

// Get all deals with plan-based filtering
router.get('/', checkDealAccess, (req, res) => {
  const user = req.user;
  const userPlanAccess = user.dealAccess ? JSON.parse(user.dealAccess) : ['basic'];

  // Build query to get deals that user can access
  const dealsQuery = `
    SELECT d.*, b.businessName, b.businessCategory, b.businessAddress
    FROM deals d
    JOIN businesses b ON d.businessId = b.businessId
    WHERE d.status = 'active' 
    AND d.expiration_date > CURDATE()
    AND (d.requiredPlanLevel IS NULL OR JSON_OVERLAPS(d.requiredPlanLevel, ?))
    ORDER BY d.created_at DESC
  `;

  db.query(dealsQuery, [JSON.stringify(userPlanAccess)], (err, results) => {
    if (err) {
      console.error('Get deals error:', err);
      return res.status(500).json({ message: 'Server error fetching deals' });
    }

    // Increment view count for each deal
    const dealIds = results.map(deal => deal.id);
    if (dealIds.length > 0) {
      db.query('UPDATE deals SET views = views + 1 WHERE id IN (?)', [dealIds], (updateErr) => {
        if (updateErr) console.error('Failed to update view counts:', updateErr);
      });
    }

    res.json({ success: true, deals: results, userPlan: user.membershipType });
  });
});

// Get specific deal with access check
router.get('/:id', checkDealAccess, (req, res) => {
  const user = req.user;
  const dealId = req.params.id;
  const userPlanAccess = user.dealAccess ? JSON.parse(user.dealAccess) : ['basic'];

  const dealQuery = `
    SELECT d.*, b.businessName, b.businessCategory, b.businessAddress, b.businessPhone, b.businessEmail
    FROM deals d
    JOIN businesses b ON d.businessId = b.businessId
    WHERE d.id = ?
  `;

  db.query(dealQuery, [dealId], (err, results) => {
    if (err) {
      console.error('Get deal error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (!results.length) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const deal = results[0];

    // Check if user can access this deal based on plan
    if (deal.requiredPlanLevel) {
      const requiredPlans = JSON.parse(deal.requiredPlanLevel);
      const hasAccess = requiredPlans.some(plan => userPlanAccess.includes(plan));
      
      if (!hasAccess) {
        return res.status(403).json({ 
          message: 'This deal requires a higher plan. Please upgrade to access this exclusive offer.',
          requiredPlans,
          userPlan: user.membershipType,
          upgradeRequired: true
        });
      }
    }

    // Check if deal is active and not expired
    if (deal.status !== 'active') {
      return res.status(403).json({ message: 'This deal is not currently available' });
    }

    if (new Date(deal.expiration_date) < new Date()) {
      return res.status(403).json({ message: 'This deal has expired' });
    }

    // Increment view count
    db.query('UPDATE deals SET views = views + 1 WHERE id = ?', [dealId], (updateErr) => {
      if (updateErr) console.error('Failed to update view count:', updateErr);
    });

    res.json({ success: true, deal });
  });
});

// Redeem a deal
router.post('/:id/redeem', checkDealAccess, (req, res) => {
  const user = req.user;
  const dealId = req.params.id;
  const userId = user.id;

  // First check if user already has a pending redemption for this deal
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
      WHERE userId = ? AND DATE_FORMAT(redeemedAt, '%Y-%m') = ? AND status = 'approved'
    `;

    db.query(monthlyLimitQuery, [userId, currentMonth], (err2, limitResults) => {
      if (err2) {
        console.error('Monthly limit check error:', err2);
        return res.status(500).json({ message: 'Server error' });
      }

      const redemptionsThisMonth = limitResults[0]?.redemptionsThisMonth || 0;
      const monthlyLimit = user.customRedemptionLimit || user.maxRedemptionsPerMonth || 0;

      // Only enforce limit if it's positive and not -1 (which means unlimited)
      if (monthlyLimit > 0 && monthlyLimit !== -1 && redemptionsThisMonth >= monthlyLimit) {
        return res.status(403).json({ 
          message: `You have reached your monthly redemption limit of ${monthlyLimit}. Upgrade your plan for more redemptions.`,
          monthlyLimit,
          redemptionsUsed: redemptionsThisMonth
        });
      }

      // Get deal details to verify it's still active
      db.query('SELECT * FROM deals WHERE id = ? AND status = "active" AND expiration_date > CURDATE()', [dealId], (err3, dealResults) => {
        if (err3) {
          console.error('Deal check error:', err3);
          return res.status(500).json({ message: 'Server error' });
        }

        if (!dealResults.length) {
          return res.status(404).json({ message: 'Deal not found or no longer active' });
        }

        const deal = dealResults[0];

        // Check max redemptions for the deal
        if (deal.maxRedemptions) {
          db.query('SELECT COUNT(*) as totalRedemptions FROM deal_redemptions WHERE dealId = ? AND status = "approved"', [dealId], (err4, countResults) => {
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
          const insertQuery = 'INSERT INTO deal_redemptions (deal_id, user_id, redeemed_at, redemptionCode, status) VALUES (?, ?, NOW(), ?, "pending")';
          
          db.query(insertQuery, [dealId, userId, redemptionCode], (err5, result) => {
            if (err5) {
              console.error('Redemption request insert error:', err5);
              return res.status(500).json({ message: 'Server error processing redemption request' });
            }

            // Send notification to merchant about the redemption request
            const redemptionId = result.insertId;
            
            // Comprehensive error handling for email operations
            try {
              const notificationPromise = notificationService.onRedemptionRequested(redemptionId, {
                dealTitle: deal.title,
                userName: user.fullName,
                userEmail: user.email,
                redemptionCode: redemptionCode
              });
              
              notificationPromise.then(result => {
                console.log('📧 Redemption notification sent successfully:', {
                  redemptionId: redemptionId,
                  dealTitle: deal.title,
                  userName: user.fullName,
                  result: result
                });
              }).catch(emailError => {
                console.error('📧 Failed to send redemption notification:', {
                  redemptionId: redemptionId,
                  dealTitle: deal.title,
                  userName: user.fullName,
                  userEmail: user.email,
                  error: emailError.message,
                  stack: emailError.stack
                });
                
                // Log the email failure but don't fail the redemption
                // Optional: Store failed notification for retry later
                console.warn('⚠️ Redemption successful but notification failed - user may not receive confirmation email');
              });
            } catch (notificationError) {
              console.error('💥 Critical error in notification service setup:', {
                redemptionId: redemptionId,
                dealTitle: deal.title,
                error: notificationError.message,
                stack: notificationError.stack
              });
              
              // Log critical notification service error
              console.warn('⚠️ Notification service error - redemption successful but no email sent');
            }

            // Don't update deal redemption count yet - wait for merchant approval

            res.json({ 
              success: true, 
              message: '\ud83c\udf89 Redemption request submitted! The merchant will review your request and contact you for verification. You will be notified once approved.',
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
  const userId = req.user.id;

  const query = `
    SELECT dr.*, d.title, d.description, d.discount, d.discountType, b.businessName, b.businessAddress
    FROM deal_redemptions dr
    JOIN deals d ON dr.dealId = d.id
    JOIN businesses b ON d.businessId = b.businessId
    WHERE dr.userId = ?
    ORDER BY dr.redeemedAt DESC
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
    }

    // Get redemption details
    const redemptionsQuery = `
      SELECT dr.*, u.fullName, u.phone, u.membershipNumber, u.email
      FROM deal_redemptions dr
      JOIN users u ON dr.userId = u.id
      WHERE dr.dealId = ?
      ORDER BY dr.redeemedAt DESC
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

module.exports = router;
