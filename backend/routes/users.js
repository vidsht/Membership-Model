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
  db.query('SELECT id, fullName, email, phone, address, profilePicture, preferences, membership, socialMediaFollowed, membershipNumber, membershipType, bloodGroup, statusUpdatedAt, validationDate, planExpiryDate, subscriptionEndDate, planEndDate, created_at FROM users WHERE id = ?', [userId], (err, results) => {
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
    res.json({ user });
  });
});

// @route   GET /api/users/profile/complete
// @desc    Get complete user profile with all fields
// @access  Private
router.get('/profile/complete', auth, (req, res) => {
  const userId = req.user.id;
  
  // Get all available user fields
    const query = `
      SELECT 
        id, fullName, email, phone, dob, bloodGroup, 
        community, address, country, state, city, profilePicture, profilePhoto,
        membership, membershipType, membershipNumber, preferences, created_at, 
        lastLogin, updated_at, validationDate, userType
      FROM users 
      WHERE id = ?
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
    
    res.json({ user });
  });
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, (req, res) => {
  const userId = req.user.id;
  const { 
    fullName, firstName, lastName, email, phone, dob, gender, 
    bloodGroup, community, address, country 
  } = req.body;
  
  // Serialize address if it's an object
  const addressStr = address && typeof address === 'object' ? JSON.stringify(address) : address || null;
  
  // Check if email is already taken by another user
  if (email) {
    db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, results) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (results.length) return res.status(400).json({ message: 'Email is already taken' });
      
      // Update user with email
      db.query(
        `UPDATE users SET 
         fullName=?, firstName=?, lastName=?, email=?, phone=?, dob=?, 
         gender=?, bloodGroup=?, community=?, address=?, country=?, updated_at=NOW() 
         WHERE id=?`,
        [fullName, firstName, lastName, email, phone, dob, gender, bloodGroup, community, addressStr, country, userId],
        (err2) => {
          if (err2) {
            console.error('Profile update error:', err2);
            return res.status(500).json({ message: 'Server error' });
          }
          
          // Fetch updated user data
          db.query(
            `SELECT id, fullName, firstName, lastName, email, phone, dob, gender, 
             bloodGroup, community, address, country, profilePicture, membership, 
             membershipType, membershipNumber, status, role, created_at 
             FROM users WHERE id = ?`, 
            [userId], 
            (err3, results2) => {
              if (err3) return res.status(500).json({ message: 'Server error' });
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
       fullName=?, firstName=?, lastName=?, phone=?, dob=?, 
       gender=?, bloodGroup=?, community=?, address=?, country=?, updated_at=NOW() 
       WHERE id=?`,
      [fullName, firstName, lastName, phone, dob, gender, bloodGroup, community, addressStr, country, userId],
      (err2) => {
        if (err2) {
          console.error('Profile update error:', err2);
          return res.status(500).json({ message: 'Server error' });
        }
        
        // Fetch updated user data
        db.query(
          `SELECT id, fullName, firstName, lastName, email, phone, dob, gender, 
           bloodGroup, community, address, country, profilePicture, membership, 
           membershipType, membershipNumber, status, role, created_at 
           FROM users WHERE id = ?`, 
          [userId], 
          (err3, results2) => {
            if (err3) return res.status(500).json({ message: 'Server error' });
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
        
        res.json({ 
          redemptions: redemptions || [],
          total: redemptions ? redemptions.length : 0
        });
      });
    });
  } catch (error) {
    console.error('Error in redemption history endpoint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


module.exports = router;
