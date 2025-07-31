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
        (fullName, email, password, phone, address, profilePicture, preferences, membership, socialMediaFollowed, userType, status, adminRole, permissions, termsAccepted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const insertValues = [
        fullName,
        email,
        hashedPassword,
        phone || null,
        address || null,
        profilePicture || null,
        preferences || null,
        membership || 'community',
        socialMediaJson,
        userType || 'member',
        status || 'active',
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
          db.query('SELECT id, fullName, email, phone, address, profilePicture, preferences, membership, membershipNumber, socialMediaFollowed, userType, status, adminRole, permissions, created_at, lastLogin, resetPasswordToken FROM users WHERE id = ?', [result.insertId], (err3, userRows) => {
            if (err3) {
              console.error('Registration SQL error (SELECT after INSERT):', err3);
              return res.status(500).json({ success: false, message: 'Server error', error: err3.message });
            }
            const user = userRows && userRows[0] ? userRows[0] : null;
            res.status(201).json({ success: true, message: 'User registered successfully! Welcome to Indians in Ghana community.', user });
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
            profilePicture: user.profilePicture,
            membership: user.membership,
            membershipNumber: user.membershipNumber,
            socialMediaFollowed: user.socialMediaFollowed ? JSON.parse(user.socialMediaFollowed) : {},
            userType: user.userType, // Ensure userType is always included
            created_at: user.created_at
          },
          success: true
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out. Please try again.' });
    }
    res.json({ message: 'Logged out successfully! See you soon.', success: true });
  });
});

// Forgot Password - Request Password Reset (MySQL)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!results.length) {
        // For security, always return success
        return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link shortly.', success: true });
      }
      const user = results[0];
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      
      // Set token expiration (30 minutes from now)
      const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      db.query('UPDATE users SET resetPasswordToken=?, resetPasswordExpires=? WHERE id=?', [resetToken, resetTokenExpires, user.id], (err2) => {
        if (err2) return res.status(500).json({ message: 'Server error' });
        // Here you would send the email with the reset link
        // e.g., http://yourfrontend/reset-password/{resetToken}
        res.json({ message: 'If your email is registered, you will receive a password reset link shortly.', success: true });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Validate Reset Token (MySQL)
router.get('/reset-password/:token/validate', async (req, res) => {
  try {
    const { token } = req.params;
    db.query('SELECT * FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > NOW()', [token], (err, results) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!results.length) return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
      res.json({ message: 'Token is valid', success: true });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset Password (MySQL)
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    db.query('SELECT * FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > NOW()', [token], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!results.length) return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
      const user = results[0];
      const hashedPassword = await require('bcryptjs').hash(newPassword, 10);
      db.query('UPDATE users SET password=?, resetPasswordToken=NULL, resetPasswordExpires=NULL WHERE id=?', [hashedPassword, user.id], (err2) => {
        if (err2) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'Password has been reset successfully.', success: true });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Refresh session
// Refresh session (MySQL version)
router.post('/refresh', auth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication failed.' });
    }

    // Update last activity time
    db.query('UPDATE users SET lastActive = NOW() WHERE id = ?', [userId], (err) => {
      if (err) {
        console.error('Session refresh SQL error (UPDATE):', err);
        // Not a fatal error, continue
      }
    });

    // Check if the user had "Remember Me" enabled during login
    // This would be indicated by a longer session expiry
    const isRememberedSession = req.session.cookie.maxAge > 24 * 60 * 60 * 1000;
    
    // Refresh the session by extending its lifetime
    if (isRememberedSession) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days for remembered sessions
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours for standard sessions
    }
    
    // Get user info (only valid columns)
    db.query('SELECT id, fullName, email, phone, address, profilePicture, membership, userType FROM users WHERE id = ?', [userId], (err2, results) => {
      if (err2) {
        console.error('Session refresh SQL error (SELECT):', err2);
        return res.status(500).json({ message: 'Server error', error: err2.message });
      }
      if (!results.length) {
        return res.status(404).json({ message: 'User not found' });
      }
      const user = results[0];
      req.session.save((err3) => {
        if (err3) {
          console.error('Session refresh error:', err3);
          return res.status(500).json({ message: 'Session refresh failed' });
        }
        
        res.json({
          message: 'Session refreshed successfully',
          success: true,
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            userType: user.userType,
            phone: user.phone,
            address: user.address,
            profilePicture: user.profilePicture,
            membership: user.membership
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user (MySQL)
router.get('/me', auth, (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Authentication failed.' });
  }
  db.query('SELECT id, fullName, email, phone, address, profilePicture, membership, socialMediaFollowed, created_at FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
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

// Merchant Register
router.post('/merchant/register', async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Empty request body' });
    }

    const {
      fullName, 
      email, 
      password, 
      phone, 
      address,
      businessInfo,
      socialMediaFollowed
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required.' });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    
    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    
    // Social media validation
    let socialMediaJson = null;
    try {
      if (!Array.isArray(socialMediaFollowed) || socialMediaFollowed.length === 0) {
        return res.status(400).json({ message: 'Please follow at least one social media channel.' });
      }
      socialMediaJson = JSON.stringify(socialMediaFollowed);
    } catch (jsonErr) {
      console.error('Merchant registration JSON error (socialMediaFollowed):', jsonErr);
      return res.status(400).json({ message: 'Invalid social media data.' });
    }

    // Check if merchant user exists
    db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Merchant registration SQL error (SELECT):', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
      }
      if (results.length) {
        return res.status(400).json({ message: 'A merchant account with this email already exists. Please try logging in instead.' });
      }

      // Validate required business info
      if (!businessInfo || !businessInfo.businessName || !businessInfo.businessCategory) {
        return res.status(400).json({ message: 'Business name and category are required to create a merchant account.' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert merchant user
      db.query(
        'INSERT INTO users (fullName, email, password, phone, address, userType) VALUES (?, ?, ?, ?, ?, ?)',
        [fullName, email, hashedPassword, phone, address, 'merchant'],
        (err2, result) => {
          if (err2) {
            console.error('Merchant registration SQL error (INSERT user):', err2);
            return res.status(500).json({ message: 'Server error', error: err2.message });
          }
          const userId = result.insertId;

          // Generate a unique random businessId (8-char alphanumeric)
          function generateBusinessId(length = 8) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let id = '';
            for (let i = 0; i < length; i++) {
              id += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return id;
          }

          const businessId = generateBusinessId();

          db.query(
            'INSERT INTO businesses (userId, businessId, businessName, businessDescription, businessCategory, businessAddress, businessPhone, businessEmail, website, businessLicense, taxId, isVerified, socialMediaFollowed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              userId,
              businessId,
              businessInfo.businessName,
              businessInfo.businessDescription || '',
              businessInfo.businessCategory,
              businessInfo.businessAddress || '',
              businessInfo.businessPhone || phone,
              businessInfo.businessEmail || email,
              businessInfo.website || '',
              businessInfo.businessLicense || '',
              businessInfo.taxId || '',
              0, // isVerified
              socialMediaJson
            ],
            (err3, result2) => {
              if (err3) {
                console.error('Merchant registration SQL error (INSERT business):', err3);
                return res.status(500).json({ message: 'Server error', error: err3.message });
              }

              // Set session and save it
              req.session.userId = userId;
              req.session.save((err4) => {
                if (err4) {
                  console.error('Session save error:', err4);
                  return res.status(500).json({ message: 'Session error' });
                }

                res.status(201).json({
                  message: 'Merchant account created successfully! Welcome to the business community.',
                  user: {
                    id: userId,
                    fullName,
                    email,
                    phone,
                    address,
                    userType: 'merchant',
                    businessInfo: {
                      businessId,
                      businessName: businessInfo.businessName,
                      businessDescription: businessInfo.businessDescription || '',
                      businessCategory: businessInfo.businessCategory,
                      businessAddress: businessInfo.businessAddress || '',
                      businessPhone: businessInfo.businessPhone || phone,
                      businessEmail: businessInfo.businessEmail || email,
                      website: businessInfo.website || '',
                      businessLicense: businessInfo.businessLicense || '',
                      taxId: businessInfo.taxId || '',
                      isVerified: false,
                      socialMediaFollowed: socialMediaFollowed
                    }
                  },
                  success: true
                });
              });
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Merchant registration error:', error);
    res.status(500).json({ message: 'Server error during merchant registration', error: error.message });
  }
});

// Validate token route
router.post('/validate-token', auth, async (req, res) => {
  try {
    return res.json({ isValid: true, user: req.user });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
