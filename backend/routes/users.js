const db = require('../db');
const { auth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const express = require('express');
const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
// Get user profile (MySQL)
router.get('/profile', auth, (req, res) => {
  const userId = req.user.id;
  const query = `
    SELECT id, fullName, email, phone, address, profilePicture, preferences,
           membership, socialMediaFollowed, membershipNumber, membershipType,
           bloodGroup, statusUpdatedAt, validationDate, planExpiryDate,
           subscriptionEndDate, planEndDate, customRedemptionLimit, monthlyRedemptionCount,
           monthlyRedemptionLimit, monthlyDealCount, monthlyDealLimit, created_at
    FROM users WHERE id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Get profile error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!results.length) return res.status(404).json({ message: 'User not found' });
    const user = results[0];
    if (user.socialMediaFollowed) {
      try {
        user.socialMediaFollowed = JSON.parse(user.socialMediaFollowed);
      } catch (e) {
        user.socialMediaFollowed = {};
      }
    }

    // Compute remaining allowances (limit - used). If limit is null treat as 0.
    const redemptionLimit = Number(user.monthlyRedemptionLimit || 0);
    const redemptionUsed = Number(user.monthlyRedemptionCount || 0);
    
    // Get pending requests count for this month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const pendingQuery = `
      SELECT COUNT(*) as pendingCount 
      FROM deal_redemptions 
      WHERE user_id = ? AND DATE_FORMAT(redeemed_at, '%Y-%m') = ? AND status = 'pending'
    `;
    
    db.query(pendingQuery, [user.id, currentMonth], (pendingErr, pendingResults) => {
      if (pendingErr) {
        console.error('Get pending requests error:', pendingErr);
        user.pendingRequestsCount = 0;
      } else {
        user.pendingRequestsCount = pendingResults[0]?.pendingCount || 0;
      }
      
      user.monthlyRedemptionsRemaining = Math.max(redemptionLimit - redemptionUsed - user.pendingRequestsCount, 0);

      const dealLimit = Number(user.monthlyDealLimit || 0);
      const dealUsed = Number(user.monthlyDealCount || 0);
      user.monthlyDealsRemaining = Math.max(dealLimit - dealUsed, 0);

      res.json({ user });
    });
  });
});

// @route   GET /api/users/profile/complete
// @desc    Get complete user profile with all fields
// @access  Private
router.get('/profile/complete', auth, (req, res) => {
  const userId = req.user.id;
  
  // Get all available user fields with plan information and business data for merchants
  const query = `
    SELECT
      u.id,
      u.fullName,
      u.email,
      u.phone,
      u.dob,
      u.bloodGroup,
      u.community,
      u.address,
      u.country,
      u.state,
      u.city,
      u.profilePicture,
      u.profilePhoto,
      u.membership,
      u.membershipType,
      u.membershipNumber,
      u.preferences,
      u.created_at,
      u.lastLogin,
      u.updated_at,
      u.validationDate,
      u.userType,
      u.customRedemptionLimit,
      u.monthlyRedemptionCount,
      u.monthlyRedemptionLimit,
      u.monthlyDealCount,
      u.monthlyDealLimit,
      p.name AS planName,
      p.price AS planPrice,
      p.currency AS planCurrency,
      p.billingCycle,
      p.features AS planFeatures,
      p.dealAccess,
      p.maxDealRedemptions AS planMaxDealRedemptions,
      p.maxRedemptions AS planMaxRedemptions,
      p.priority AS planPriority,
      p.key AS planKey,
      b.businessName,
      b.businessDescription,
      b.businessCategory,
      b.businessAddress,
      b.businessPhone,
      b.businessEmail,
      b.website,
      b.businessId
    FROM users u
    LEFT JOIN plans p ON u.membershipType = p.key AND p.type = 'user'
    LEFT JOIN businesses b ON u.id = b.userId AND u.userType = 'merchant'
    WHERE u.id = ?
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Get complete profile error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (!results.length) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = results[0];
    
    // Parse JSON fields if they exist
    if (user.socialMediaFollowed) {
      try {
        user.socialMediaFollowed = JSON.parse(user.socialMediaFollowed);
      } catch (e) {
        user.socialMediaFollowed = {};
      }
    }
    
    if (user.preferences) {
      try {
        user.preferences = JSON.parse(user.preferences);
      } catch (e) {
        user.preferences = {};
      }
    }
    
    if (user.address && typeof user.address === 'string') {
      try {
        user.address = JSON.parse(user.address);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    // Add pending requests count for current month
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM format
    
    // Get actual redemption count for current month
    const redemptionCountQuery = `
      SELECT COUNT(*) as monthlyCount 
      FROM deal_redemptions 
      WHERE userId = ? AND DATE_FORMAT(created_at, '%Y-%m') = ? AND status = 'approved'
    `;
    
    const pendingQuery = `
      SELECT COUNT(*) as pendingRequestsCount 
      FROM deal_redemptions 
      WHERE userId = ? AND status = 'pending' AND created_at >= ?
    `;
    
    db.query(redemptionCountQuery, [userId, currentMonth], (countErr, countResults) => {
      if (countErr) {
        console.error('Error fetching redemption count:', countErr);
        user.actualMonthlyRedemptionCount = 0;
      } else {
        user.actualMonthlyRedemptionCount = countResults[0]?.monthlyCount || 0;
      }
      
      db.query(pendingQuery, [userId, firstDayOfMonth], (pendingErr, pendingResults) => {
        if (pendingErr) {
          console.error('Error fetching pending requests:', pendingErr);
          user.pendingRequestsCount = 0;
        } else {
          user.pendingRequestsCount = pendingResults[0]?.pendingRequestsCount || 0;
        }
        
        // Calculate the effective redemption limit (custom limit overrides plan limit)
        const effectiveLimit = user.customRedemptionLimit || user.planMaxDealRedemptions || 0;
        
        // Update the user object with calculated values
        user.effectiveRedemptionLimit = effectiveLimit;
        user.monthlyRedemptionsRemaining = Math.max(0, effectiveLimit - user.actualMonthlyRedemptionCount - user.pendingRequestsCount);
        
        res.json({ user });
      });
    });
  });
});

// @route   GET /api/users/profile/with-plan
// @desc    Get user profile with plan details including redemption limits
// @access  Private
router.get('/profile/with-plan', auth, (req, res) => {
  const userId = req.user.id;
  
  const query = `
    SELECT 
      u.id, u.fullName, u.email, u.phone, u.dob, u.bloodGroup, 
      u.community, u.address, u.country, u.state, u.city, 
      u.profilePicture, u.profilePhoto, u.membership, u.membershipType, 
      u.membershipNumber, u.preferences, u.created_at, u.lastLogin, 
      u.updated_at, u.validationDate, u.userType, u.customRedemptionLimit,
      u.statusUpdatedAt, u.planExpiryDate, u.subscriptionEndDate, u.planEndDate,
      u.monthlyRedemptionCount, u.monthlyRedemptionLimit, u.monthlyDealCount, u.monthlyDealLimit,
      p.name as planName, p.price as planPrice, p.currency as planCurrency,
      p.billingCycle, p.features as planFeatures, p.dealAccess,
      p.maxDealRedemptions as planMaxDealRedemptions, p.maxRedemptions as planMaxRedemptions, 
      p.priority as planPriority, p.\`key\` as planKey
    FROM users u
    LEFT JOIN plans p ON u.membershipType = p.\`key\` AND p.type = 'user'
    WHERE u.id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Get profile with plan error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (!results.length) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = results[0];
    
    // Parse JSON fields if they exist
    if (user.preferences) {
      try {
        user.preferences = JSON.parse(user.preferences);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }
    
    if (user.planFeatures) {
      try {
        user.planFeatures = JSON.parse(user.planFeatures);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    // Compute remaining allowances for frontend convenience
    const redemptionLimit = Number(user.monthlyRedemptionLimit || 0);
    const redemptionUsed = Number(user.monthlyRedemptionCount || 0);
    
    // Get pending requests count for this month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const pendingQuery = `
      SELECT COUNT(*) as pendingCount 
      FROM deal_redemptions 
      WHERE user_id = ? AND DATE_FORMAT(redeemed_at, '%Y-%m') = ? AND status = 'pending'
    `;
    
    db.query(pendingQuery, [user.id, currentMonth], (pendingErr, pendingResults) => {
      if (pendingErr) {
        console.error('Get pending requests error:', pendingErr);
        user.pendingRequestsCount = 0;
      } else {
        user.pendingRequestsCount = pendingResults[0]?.pendingCount || 0;
      }
      
      user.monthlyRedemptionsRemaining = Math.max(redemptionLimit - redemptionUsed - user.pendingRequestsCount, 0);

      const dealLimit = Number(user.monthlyDealLimit || 0);
      const dealUsed = Number(user.monthlyDealCount || 0);
      user.monthlyDealsRemaining = Math.max(dealLimit - dealUsed, 0);

      res.json({ user });
    });
  });
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, (req, res) => {
  try {
    const userId = req.user.id;
    console.log('PUT /api/users/profile called for userId=', userId, 'payload=', req.body);

    const { 
      fullName, email, phone, dob, 
      bloodGroup, community, address, country 
    } = req.body;

    // Serialize address if it's an object
    const addressStr = address && typeof address === 'object' ? JSON.stringify(address) : address || null;

    // Check if email is already taken by another user
    if (email) {
      db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, results) => {
        if (err) {
          console.error('Error checking email uniqueness:', err);
          return res.status(500).json({ message: 'Server error', error: err.message });
        }
        if (results.length) return res.status(400).json({ message: 'Email is already taken' });
        
        // Update user with email
        db.query(
          `UPDATE users SET 
           fullName=?, email=?, phone=?, dob=?, 
           bloodGroup=?, community=?, address=?, country=?, updated_at=NOW() 
           WHERE id=?`,
          [fullName, email, phone, dob, bloodGroup, community, addressStr, country, userId],
          (err2) => {
            if (err2) {
              console.error('Profile update error (email branch):', err2);
              return res.status(500).json({ message: 'Server error', error: err2.message });
            }
            
            // Fetch updated user data
            db.query(
              `SELECT id, fullName, email, phone, dob, 
               bloodGroup, community, address, country, profilePicture, membership, 
               membershipType, membershipNumber, status, created_at 
               FROM users WHERE id = ?`, 
              [userId], 
              (err3, results2) => {
                if (err3) {
                  console.error('Error fetching updated user (email branch):', err3);
                  return res.status(500).json({ message: 'Server error', error: err3.message });
                }
                const user = results2[0];
                
                // Parse address if it's JSON string
                if (user.address && typeof user.address === 'string') {
                  try { 
                    user.address = JSON.parse(user.address); 
                  } catch (e) { 
                    // Keep as string if not valid JSON
                  }
                }
                
                res.json({ user });
              }
            );
          }
        );
      });
    } else {
      // Update user without email change
      db.query(
        `UPDATE users SET 
         fullName=?, phone=?, dob=?, 
         bloodGroup=?, community=?, address=?, country=?, updated_at=NOW() 
         WHERE id=?`,
        [fullName, phone, dob, bloodGroup, community, addressStr, country, userId],
        (err2) => {
          if (err2) {
            console.error('Profile update error (no-email branch):', err2);
            return res.status(500).json({ message: 'Server error', error: err2.message });
          }
          
          // Fetch updated user data
          db.query(
            `SELECT id, fullName, email, phone, dob, 
             bloodGroup, community, address, country, profilePicture, membership, 
             membershipType, membershipNumber, status, created_at 
             FROM users WHERE id = ?`, 
            [userId], 
            (err3, results2) => {
              if (err3) {
                console.error('Error fetching updated user (no-email branch):', err3);
                return res.status(500).json({ message: 'Server error', error: err3.message });
              }
              const user = results2[0];
              
              // Parse address if it's JSON string
              if (user.address && typeof user.address === 'string') {
                try { 
                  user.address = JSON.parse(user.address); 
                } catch (e) { 
                  // Keep as string if not valid JSON
                }
              }
              
              res.json({ user });
            }
          );
        }
      );
    }
  } catch (ex) {
    console.error('Unexpected error in PUT /api/users/profile:', ex);
    res.status(500).json({ message: 'Server error', error: ex.message });
  }
});

// @route   PUT /api/users/password
// @desc    Change user password
// @access  Private
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    db.query('SELECT * FROM users WHERE id = ?', [req.user.id], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!results.length) return res.status(404).json({ message: 'User not found' });
      const user = results[0];
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.query('UPDATE users SET password=? WHERE id=?', [hashedPassword, req.user.id], (err2) => {
        if (err2) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'Password updated successfully' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users/redemptions/user-history
// @desc    Get user redemption history
// @access  Private
router.get('/redemptions/user-history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if deal_redemptions table exists
    const checkTableQuery = `
      SELECT COUNT(*) as tableExists 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'deal_redemptions'
    `;
    
    db.query(checkTableQuery, (err, results) => {
      if (err) {
        console.error('Error checking table existence:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!results[0].tableExists) {
        return res.json({ 
          redemptions: [],
          message: 'No redemption history available'
        });
      }
      
      // Fetch user redemption history
      const redemptionQuery = `
        SELECT 
          dr.id,
          dr.user_id,
          dr.membership_level,
          dr.deal_id,
          dr.redeemed_at,
          dr.status,
          dr.dealId,
          dr.rejection_reason,
          dr.approved_at,
          dr.rejected_at,
          d.title as dealTitle,
          d.description as dealDescription,
          d.discount,
          d.discountType,
          b.businessName,
          b.businessAddress
        FROM deal_redemptions dr
        LEFT JOIN deals d ON dr.deal_id = d.id
        LEFT JOIN businesses b ON d.businessId = b.businessId
        WHERE dr.user_id = ?
        ORDER BY dr.redeemed_at DESC
        LIMIT 50
      `;
      
      db.query(redemptionQuery, [userId], (err2, redemptions) => {
        if (err2) {
          console.error('Error fetching redemption history:', err2);
          return res.status(500).json({ message: 'Server error' });
        }

        // Normalize snake_case DB columns to camelCase expected by frontend
        const normalized = (redemptions || []).map(r => ({
          id: r.id,
          userId: r.user_id || r.userId,
          membershipLevel: r.membership_level || r.membershipLevel || null,
          dealId: r.deal_id || r.dealId || null,
          redeemedAt: r.redeemed_at || r.redeemedAt || null,
          status: r.status || null,
          rejectionReason: r.rejection_reason || r.rejectionReason || null,
          approvedAt: r.approved_at || r.approvedAt || null,
          rejectedAt: r.rejected_at || r.rejectedAt || null,
          dealTitle: r.dealTitle || r.deal_title || r.title || null,
          dealDescription: r.dealDescription || r.description || null,
          discount: r.discount || null,
          discountType: r.discountType || r.discount_type || null,
          businessName: r.businessName || r.business_name || null,
          businessAddress: r.businessAddress || r.business_address || null
        }));

        res.json({ 
          redemptions: normalized,
          total: normalized.length
        });
      });
    });
  } catch (error) {
    console.error('Error in redemption history endpoint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


module.exports = router;
