const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    // Accept all frontend registration fields
    const {
      fullName,
      email,
      password,
      phone,
      address,
      dob,
      community,
      country,
      state,
      city,
      profilePicture,
      preferences,
      membership,
      socialMediaFollowed,
      userType,
      status,
      adminRole,
      permissions,
      termsAccepted
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (!termsAccepted) {
      return res.status(400).json({ success: false, message: 'You must accept the terms and conditions.' });
    }

    db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Registration SQL error (SELECT):', err);
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
      }
      if (results.length) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists. Please try logging in instead.' });
      }

      let socialMediaJson = null;
      try {
        if (socialMediaFollowed) {
          socialMediaJson = JSON.stringify(socialMediaFollowed);
        }
      } catch (jsonErr) {
        console.error('Registration JSON error (socialMediaFollowed):', jsonErr);
        return res.status(400).json({ success: false, message: 'Invalid social media data.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const insertQuery = `INSERT INTO users
        (fullName, email, password, phone, address, dob, community, country, state, city, profilePicture, preferences, membership, socialMediaFollowed, userType, status, adminRole, permissions, termsAccepted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const insertValues = [
        fullName,
        email,
        hashedPassword,
        phone || null,
        address || null,
        dob || null,
        community || null,
        country || 'Ghana',
        state || null,
        city || null,
        profilePicture || null,
        preferences || null,
        membership || 'community',
        socialMediaJson,
        userType || 'user',
        status || 'pending',
        adminRole || null,
        permissions || null,
        termsAccepted ? 1 : 0
      ];
      
      db.query(insertQuery, insertValues, (err2, result) => {
        if (err2) {
          console.error('Registration SQL error (INSERT):', err2);
          return res.status(500).json({ success: false, message: 'Server error', error: err2.message });
        }
        
        // Generate membershipNumber (e.g., IIG000123)
        const membershipNumber = `IIG${String(result.insertId).padStart(6, '0')}`;
        db.query('UPDATE users SET membershipNumber = ? WHERE id = ?', [membershipNumber, result.insertId], (errUpdate) => {
          if (errUpdate) {
            console.error('Registration SQL error (UPDATE membershipNumber):', errUpdate);
            // Not fatal, continue
          }
            // Fetch the created user (excluding password)
          db.query('SELECT id, fullName, email, phone, address, community, country, state, city, profilePicture, preferences, membership, membershipNumber, socialMediaFollowed, userType, status, adminRole, permissions, created_at, lastLogin FROM users WHERE id = ?', [result.insertId], (err3, userRows) => {
            if (err3) {
              console.error('Registration SQL error (SELECT after INSERT):', err3);
              return res.status(500).json({ success: false, message: 'Server error', error: err3.message });
            }
            const user = userRows && userRows[0] ? userRows[0] : null;
            res.status(201).json({ 
              success: true, 
              message: 'Registration successful! Your account is pending approval. Welcome to Indians in Ghana community.', 
              user 
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Registration catch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Login (MySQL)
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required to log in.' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!results.length) return res.status(400).json({ message: 'Invalid email or password. Please check your credentials and try again.' });
      
      const user = results[0];
      
      // Check if user is approved
      if (user.status !== 'approved' && user.status !== 'active') {
        return res.status(403).json({ 
          message: `Your account is ${user.status}. Please contact support for assistance.` 
        });
      }
      
      try {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: 'Invalid email or password. Please check your credentials and try again.' });
        }
      } catch (bcryptError) {
        console.error('bcrypt error during login:', bcryptError);
        return res.status(500).json({ message: 'Authentication error. Please try again.' });
      }

      // Update last login
      db.query('UPDATE users SET lastLogin = NOW() WHERE id = ?', [user.id], (err2) => {
        if (err2) console.error('Failed to update lastLogin:', err2);
      });
      
      req.session.userId = user.id;
      if (rememberMe) {
        // Extend session to 30 days if "Remember Me" is checked
        req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
      } else {
        // Default session length (1 day)
        req.session.cookie.maxAge = 1000 * 60 * 60 * 24; // 1 day
      }
      
      req.session.save((err2) => {
        if (err2) return res.status(500).json({ message: 'Session error' });
        res.json({
          message: 'Login successful! Welcome back to Indians in Ghana.',
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            address: user.address,
            dob: user.dob,
            community: user.community,
            country: user.country,
            state: user.state,
            city: user.city,
            profilePicture: user.profilePicture,
            membership: user.membership,
            membershipNumber: user.membershipNumber,
            socialMediaFollowed: user.socialMediaFollowed ? JSON.parse(user.socialMediaFollowed) : {},
            userType: user.userType,
            status: user.status,
            created_at: user.created_at
          },
          success: true
        });
      });
    });
  } catch (error) {
    console.error('Login catch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Merchant Register
router.post('/merchant/register', async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      phone,
      socialMediaFollowed,
      businessInfo
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    if (!businessInfo || !businessInfo.businessName) {
      return res.status(400).json({ success: false, message: 'Business information is required.' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Merchant registration SQL error (SELECT):', err);
        return res.status(500).json({ success: false, message: 'Server error', error: err.message });
      }
      if (results.length) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      }

      let socialMediaJson = null;
      try {
        if (socialMediaFollowed) {
          socialMediaJson = JSON.stringify(socialMediaFollowed);
        }
      } catch (jsonErr) {
        console.error('Merchant registration JSON error:', jsonErr);
        return res.status(400).json({ success: false, message: 'Invalid social media data.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert user first
      const insertUserQuery = `INSERT INTO users
        (fullName, email, password, phone, socialMediaFollowed, userType, status, membership)
        VALUES (?, ?, ?, ?, ?, 'merchant', 'pending', 'basic')`;
      
      const userValues = [fullName, email, hashedPassword, phone || null, socialMediaJson];
      
      db.query(insertUserQuery, userValues, (err2, userResult) => {
        if (err2) {
          console.error('Merchant registration SQL error (INSERT user):', err2);
          return res.status(500).json({ success: false, message: 'Server error', error: err2.message });
        }

        const userId = userResult.insertId;
        
        // Generate membershipNumber
        const membershipNumber = `IIG${String(userId).padStart(6, '0')}`;
        db.query('UPDATE users SET membershipNumber = ? WHERE id = ?', [membershipNumber, userId], (errUpdate) => {
          if (errUpdate) console.error('Failed to update membershipNumber:', errUpdate);
        });

        // Insert business information
        const insertBusinessQuery = `INSERT INTO businesses
          (userId, businessName, businessDescription, businessCategory, businessAddress, businessPhone, businessEmail, website, businessLicense, taxId, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`;
        
        const businessValues = [
          userId,
          businessInfo.businessName,
          businessInfo.businessDescription || null,
          businessInfo.businessCategory || null,
          businessInfo.businessAddress || null,
          businessInfo.businessPhone || phone,
          businessInfo.businessEmail || email,
          businessInfo.website || null,
          businessInfo.businessLicense || null,
          businessInfo.taxId || null
        ];
        
        db.query(insertBusinessQuery, businessValues, (err3, businessResult) => {
          if (err3) {
            console.error('Merchant registration SQL error (INSERT business):', err3);
            // Rollback user creation
            db.query('DELETE FROM users WHERE id = ?', [userId], () => {});
            return res.status(500).json({ success: false, message: 'Server error', error: err3.message });
          }

          // Fetch the created user and business
          const selectQuery = `
            SELECT u.id, u.fullName, u.email, u.phone, u.membershipNumber, u.socialMediaFollowed, u.userType, u.status, u.created_at,
                   b.businessId, b.businessName, b.businessDescription, b.businessCategory, b.businessAddress, b.businessPhone, b.businessEmail, b.website
            FROM users u
            LEFT JOIN businesses b ON u.id = b.userId
            WHERE u.id = ?
          `;
          
          db.query(selectQuery, [userId], (err4, userRows) => {
            if (err4) {
              console.error('Merchant registration SQL error (SELECT after INSERT):', err4);
              return res.status(500).json({ success: false, message: 'Server error', error: err4.message });
            }
            
            const user = userRows && userRows[0] ? userRows[0] : null;
            res.status(201).json({ 
              success: true, 
              message: 'Merchant account created successfully! Your account is pending approval.', 
              user 
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Merchant registration catch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: 'Logout error' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully', success: true });
  });
});

// Get current user
router.get('/me', auth, (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  db.query('SELECT id, fullName, email, phone, address, dob, community, country, state, city, profilePicture, preferences, membership, membershipNumber, socialMediaFollowed, userType, status, adminRole, permissions, created_at, lastLogin FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Get user SQL error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!results.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];
    res.json({
      user: {
        ...user,
        socialMediaFollowed: user.socialMediaFollowed ? JSON.parse(user.socialMediaFollowed) : {}
      }
    });
  });
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('Forgot password SQL error:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      // Always return success message for security
      res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.',
        success: true 
      });
      
      if (results.length) {
        // TODO: Implement email sending logic here
        console.log(`Password reset requested for user ID: ${results[0].id}`);
      }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // TODO: Implement token validation and password reset logic
    res.json({ 
      message: 'Password reset functionality is not yet implemented',
      success: false 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
