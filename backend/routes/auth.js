const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { generateMembershipNumber } = require('../utils/membershipGenerator');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {    // Accept all frontend registration fields
    const {
      fullName,
      email,
      password,
      phone,
      address,
      dob,
      bloodGroup,
      community,
      country,
      state,
      city,
      userCategory,
      plan, // Use dynamic plan instead of membership
      profilePicture,
      preferences,
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
      }      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Get default plan if none selected
      let selectedPlan = plan;
      if (!selectedPlan) {
        // Fetch the first available user plan
        const defaultPlanResult = await new Promise((resolve, reject) => {
          db.query('SELECT `key` FROM plans WHERE type = ? AND isActive = 1 ORDER BY priority DESC LIMIT 1', ['user'], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
        selectedPlan = defaultPlanResult.length > 0 ? defaultPlanResult[0].key : 'community';
      }
      
      const insertQuery = `INSERT INTO users
        (fullName, email, password, phone, address, dob, bloodGroup, community, country, state, city, userCategory, profilePicture, preferences, membershipType, socialMediaFollowed, userType, status, adminRole, permissions, termsAccepted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const insertValues = [
        fullName,
        email,
        hashedPassword,
        phone || null,
        address || null,
        dob || null,
        bloodGroup || null,
        community || null,
        country || 'Ghana',
        state || null,
        city || null,
        userCategory || null,
        profilePicture || null,
        preferences || null,
        selectedPlan, // Use dynamic plan and save to membershipType instead of membership
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
        
        // Generate new format membershipNumber (16 digits: ABCD EFGH IJKL MNOP)
        const membershipNumber = generateMembershipNumber();
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
            // Log activity: user registration
            const activityQuery = `INSERT INTO activities (type, title, description, userId, userName, userEmail, userType, timestamp, icon)
              VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`;
            const activityValues = [
              'user_registered',
              'New User Registered',
              `${user.fullName} registered as a new user.`,
              user.id,
              user.fullName,
              user.email,
              user.userType || 'user',
              'fa-user-plus'
            ];
            db.query(activityQuery, activityValues, (errAct) => {
              if (errAct) {
                console.error('Failed to log registration activity:', errAct);
              }
              res.status(201).json({ 
                success: true, 
                message: 'Registration successful! Your account is pending approval. Welcome to Indians in Ghana community.', 
                user 
              });
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
      
      // Allow login for pending users but include status info in response
      // Only block if status is rejected or suspended
      if (user.status === 'rejected' || user.status === 'suspended') {
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
        
        // Customize message based on user status
        let loginMessage = 'Login successful! Welcome back to Indians in Ghana.';
        if (user.status === 'pending') {
          loginMessage = 'Login successful! Your account is pending approval - some features may be limited until approved.';
        }
        
        res.json({
          message: loginMessage,
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
          success: true,
          isPending: user.status === 'pending' // Add flag for frontend to show banner
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
      bloodGroup,
      plan, // Add dynamic plan selection
      socialMediaFollowed,
      businessInfo
    } = req.body;

    // Debug logging for merchant registration
    console.log('Merchant registration data:', { fullName, email, plan, bloodGroup });

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
      }      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Get default plan if none selected
      let selectedPlan = plan;
      if (!selectedPlan) {
        // Fetch the lowest priority merchant plan (basic plan)
        const defaultPlanResult = await new Promise((resolve, reject) => {
          db.query('SELECT `key` FROM plans WHERE type = ? AND isActive = 1 ORDER BY dealPriority ASC LIMIT 1', ['merchant'], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
        selectedPlan = defaultPlanResult.length > 0 ? defaultPlanResult[0].key : 'basic';
      }

      console.log('Selected plan for merchant:', selectedPlan);
      
      // Insert user first
      const insertUserQuery = `INSERT INTO users
        (fullName, email, password, phone, bloodGroup, socialMediaFollowed, userType, status, membershipType)
        VALUES (?, ?, ?, ?, ?, ?, 'merchant', 'pending', ?)`;
      
      const userValues = [fullName, email, hashedPassword, phone || null, bloodGroup || null, socialMediaJson, selectedPlan];
      
      db.query(insertUserQuery, userValues, (err2, userResult) => {
        if (err2) {
          console.error('Merchant registration SQL error (INSERT user):', err2);
          return res.status(500).json({ success: false, message: 'Server error', error: err2.message });
        }

        const userId = userResult.insertId;
        
        // Generate new format membershipNumber (16 digits: ABCD EFGH IJKL MNOP)
        const membershipNumber = generateMembershipNumber();
        db.query('UPDATE users SET membershipNumber = ? WHERE id = ?', [membershipNumber, userId], (errUpdate) => {
          if (errUpdate) console.error('Failed to update membershipNumber:', errUpdate);
        });

        // Generate a unique businessId (timestamp + random)
        const businessId = `BIZ${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;

        // Insert business information
        const insertBusinessQuery = `INSERT INTO businesses
          (businessId, userId, businessName, businessDescription, businessCategory, businessAddress, businessPhone, businessEmail, website, businessLicense, taxId, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`;

        const businessValues = [
          businessId,
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
            // Log activity: merchant registration
            const activityQuery = `INSERT INTO activities (type, title, description, userId, userName, userEmail, userType, timestamp, icon)
              VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`;
            const activityValues = [
              'business_registered',
              'New Merchant Registered',
              `${user.fullName} registered as a new merchant (${user.businessName || ''}).`,
              user.id,
              user.fullName,
              user.email,
              user.userType || 'merchant',
              'fa-store'
            ];
            db.query(activityQuery, activityValues, (errAct) => {
              if (errAct) {
                console.error('Failed to log merchant registration activity:', errAct);
              }
              // Auto-login: create session for the new merchant
              req.session.userId = user.id;
              req.session.save((err2) => {
                if (err2) {
                  return res.status(500).json({ success: false, message: 'Session error after registration' });
                }
                res.status(201).json({ 
                  success: true, 
                  message: 'Merchant account created successfully! Your account is pending approval.', 
                  user 
                });
              });
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

  // Fetch user and include business details for merchants
  const userQuery = `SELECT id, fullName, email, phone, address, dob, community, country, state, city, profilePicture, preferences, membership, membershipType, membershipNumber, socialMediaFollowed, userType, status, adminRole, permissions, created_at, lastLogin FROM users WHERE id = ?`;

  db.query(userQuery, [userId], (err, results) => {
    if (err) {
      console.error('Get user SQL error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!results.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];

    // If user is a merchant, fetch their business row and attach it
    if (user.userType === 'merchant') {
      db.query('SELECT businessId, businessName, businessDescription, businessCategory, businessAddress, businessPhone, businessEmail, website, businessLicense, taxId, isVerified, verificationDate, status as businessStatus, created_at as businessCreatedAt FROM businesses WHERE userId = ? LIMIT 1', [userId], (bizErr, bizResults) => {
        if (bizErr) {
          console.error('Error fetching business for /me:', bizErr);
          // Return user without business on error
          return res.json({
            user: {
              ...user,
              socialMediaFollowed: user.socialMediaFollowed ? JSON.parse(user.socialMediaFollowed) : {}
            }
          });
        }

        const business = bizResults && bizResults[0] ? bizResults[0] : null;

        return res.json({
          user: {
            ...user,
            socialMediaFollowed: user.socialMediaFollowed ? JSON.parse(user.socialMediaFollowed) : {},
            business
          }
        });
      });
    } else {
      return res.json({
        user: {
          ...user,
          socialMediaFollowed: user.socialMediaFollowed ? JSON.parse(user.socialMediaFollowed) : {}
        }
      });
    }
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

// Get communities for dropdown
router.get('/communities', (req, res) => {
  try {
    // Simple query that works with basic table structure
  const query = 'SELECT name, description FROM communities WHERE isActive = TRUE ORDER BY name';
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Communities query error:', err);
        // If communities table doesn't exist or has issues, return default communities
        const defaultCommunities = [
          { name: 'Gujarati', description: 'Gujarati community' },
          { name: 'Punjabi', description: 'Punjabi community' },
          { name: 'Tamil', description: 'Tamil community' },
          { name: 'Bengali', description: 'Bengali community' },
          { name: 'Hindi', description: 'Hindi speaking community' },
          { name: 'Marathi', description: 'Marathi community' },
          { name: 'Telugu', description: 'Telugu community' },
          { name: 'Kannada', description: 'Kannada community' },
          { name: 'Malayalam', description: 'Malayalam community' },
          { name: 'Sindhi', description: 'Sindhi community' },
          { name: 'Other Indian', description: 'Other Indian communities' }
        ];
        
        return res.json({ 
          success: true, 
          communities: defaultCommunities 
        });
      }
      
      res.json({ 
        success: true, 
        communities: results || []
      });
    });
  } catch (error) {
    console.error('Get communities error:', error);
    // Fallback to default communities on any error
    const defaultCommunities = [
      { name: 'Gujarati', description: 'Gujarati community' },
      { name: 'Punjabi', description: 'Punjabi community' },
      { name: 'Tamil', description: 'Tamil community' },
      { name: 'Bengali', description: 'Bengali community' },
      { name: 'Hindi', description: 'Hindi speaking community' },
      { name: 'Other Indian', description: 'Other Indian communities' }
    ];
      res.json({ 
      success: true, 
      communities: defaultCommunities 
    });
  }
});

// Get user types for dropdown  
router.get('/user-types', (req, res) => {
  try {
  const query = 'SELECT name, description FROM user_types WHERE isActive = TRUE ORDER BY name';
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('User types query error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
      
      res.json({ 
        success: true, 
        userTypes: results 
      });
    });
  } catch (error) {
    console.error('Get user types error:', error);  
    res.status(500).json({ success: false, message: 'Server error' });  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh user session
// @access  Private
router.post('/refresh', auth, async (req, res) => {
  try {
    // If we reach here, the auth middleware has validated the session
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No valid session found' });
    }
    
    // Get fresh user data
    const userResult = await new Promise((resolve, reject) => {
      db.query('SELECT id, fullName, email, userType, status FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    if (!userResult.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const user = userResult[0];
    
    // Update last active timestamp
    db.query('UPDATE users SET lastActive = NOW() WHERE id = ?', [userId], (err) => {
      if (err) console.error('Error updating last active:', err);
    });
    
    res.json({
      success: true,
      message: 'Session refreshed successfully',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        status: user.status
      }
    });
    
  } catch (error) {
    console.error('Session refresh error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// TEMPORARY: Quick admin login for development/testing
// Remove this in production
router.post('/dev-admin-login', async (req, res) => {
  // Only enable in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }
  
  try {
    console.log('Development admin login requested');
    
    // Get the first admin user
    db.query('SELECT * FROM users WHERE userType = "admin" LIMIT 1', (err, results) => {
      if (err) {
        console.error('Database error in dev-admin-login:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'No admin user found' });
      }
      
      const user = results[0];
      
      // Create session
      req.session.userId = user.id;
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24; // 1 day
      
      req.session.save((sessionErr) => {
        if (sessionErr) {
          console.error('Session save error:', sessionErr);
          return res.status(500).json({ message: 'Session error' });
        }
        
        console.log(`Development admin session created for: ${user.email}`);
        console.log(`Session ID: ${req.sessionID}`);
        
        res.json({
          success: true,
          message: 'Development admin login successful',
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            userType: user.userType,
            adminRole: user.adminRole || 'superAdmin'
          }
        });
      });
    });
  } catch (error) {
    console.error('Error in dev-admin-login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
