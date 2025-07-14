const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, phone, address, membershipType } = req.body;

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

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists. Please try logging in instead.' });
    }

    // Create user data object
    const userData = {
      fullName,
      email,
      password
    };

    // Add optional fields if provided
    if (phone) userData.phone = phone;
    if (address) userData.address = address;
    if (membershipType) userData.membershipType = membershipType;    // Create user (password will be hashed by pre-save middleware)
    const user = new User(userData);
    await user.save();

    // Set session and save it
    req.session.userId = user._id;
    
    // Save session before sending response
    req.session.save((err) => {
      if (err) {        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Session error' });
      }
      
      res.status(201).json({
        message: 'User registered successfully! Welcome to Indians in Ghana community.',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          profilePicture: user.profilePicture,
          userType: user.userType,
          membershipType: user.membershipType,
          membershipNumber: user.membershipNumber,
          joinDate: user.joinDate,
          preferences: user.preferences
        },
        success: true
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
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
      // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password. Please check your credentials and try again.' });
    }

    // Check password
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
    user.lastLogin = new Date();
    await user.save();

    // Set session and save it
    req.session.userId = user._id;
    
    // Set session expiry based on rememberMe
    if (rememberMe) {
      // Extend session to 30 days if "Remember Me" is checked
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    } else {
      // Default session length (1 day)
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24; // 1 day
    }
    
    // Save session before sending response
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Session error' });      }
      
      res.json({
        message: 'Login successful! Welcome back to Indians in Ghana.',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          profilePicture: user.profilePicture,
          userType: user.userType,
          businessInfo: user.businessInfo,
          membershipType: user.membershipType,
          membershipNumber: user.membershipNumber,
          joinDate: user.joinDate,
          lastLogin: user.lastLogin,
          preferences: user.preferences
        },
        success: true
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

// Forgot Password - Request Password Reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal whether the email exists
      return res.status(200).json({ 
        message: 'If your email is registered, you will receive a password reset link shortly.',
        success: true 
      });
    }

    // Generate a reset token (you might want to use a library like crypto)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    
    // Set token expiration (30 minutes from now)
    const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    // Save the token to the user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();    // Send email with reset link (in a real application)
    // For this example, we'll just log it
    // console.log(`Password reset link: http://localhost:3001/reset-password/${resetToken}`);
    
    // In a real application, you would use an email service like:
    // await sendPasswordResetEmail(user.email, resetToken);

    res.json({ 
      message: 'If your email is registered, you will receive a password reset link shortly.',
      success: true 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Validate Reset Token
router.get('/reset-password/:token/validate', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find user with this token and ensure it hasn't expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    res.json({ message: 'Token is valid', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user with this token and ensure it hasn't expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    // Update password and clear reset token fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    res.json({ 
      message: 'Password has been reset successfully. You can now log in with your new password.',
      success: true 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Refresh session
router.post('/refresh', auth, async (req, res) => {
  try {
    // Find the user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ message: 'Authentication failed.' });
    }

    // Update last activity time
    user.lastActive = new Date();
    await user.save();

    // Check if the user had "Remember Me" enabled during login
    // This would be indicated by a longer session expiry
    const isRememberedSession = req.session.cookie.maxAge > 24 * 60 * 60 * 1000;
    
    // Refresh the session by extending its lifetime
    if (isRememberedSession) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days for remembered sessions
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours for standard sessions
    }
    
    // Save the refreshed session
    req.session.save((err) => {
      if (err) {
        console.error('Session refresh error:', err);
        return res.status(500).json({ message: 'Session refresh failed' });
      }
      
      res.json({
        message: 'Session refreshed successfully',
        success: true,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          membershipType: user.membershipType
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me', auth, (req, res) => {  res.json({
    user: {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone,
      address: req.user.address,
      profilePicture: req.user.profilePicture,
      userType: req.user.userType,
      businessInfo: req.user.businessInfo,
      membershipType: req.user.membershipType,
      membershipNumber: req.user.membershipNumber,
      joinDate: req.user.joinDate,
      lastLogin: req.user.lastLogin,
      isActive: req.user.isActive,
      preferences: req.user.preferences
    }
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
      businessInfo 
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
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A merchant account with this email already exists. Please try logging in instead.' });
    }

    // Validate required business info
    if (!businessInfo || !businessInfo.businessName || !businessInfo.businessCategory) {
      return res.status(400).json({ message: 'Business name and category are required to create a merchant account.' });
    }

    // Create merchant user data object
    const userData = {
      fullName,
      email,
      password,
      userType: 'merchant',
      businessInfo: {
        businessName: businessInfo.businessName,
        businessDescription: businessInfo.businessDescription || '',
        businessCategory: businessInfo.businessCategory,
        businessAddress: businessInfo.businessAddress || {},
        businessPhone: businessInfo.businessPhone || phone,
        businessEmail: businessInfo.businessEmail || email,
        website: businessInfo.website || '',
        businessLicense: businessInfo.businessLicense || '',
        taxId: businessInfo.taxId || '',
        isVerified: false
      }
    };

    // Add optional fields if provided
    if (phone) userData.phone = phone;
    if (address) userData.address = address;

    // Create merchant user (password will be hashed by pre-save middleware)
    const user = new User(userData);
    await user.save();

    // Set session and save it
    req.session.userId = user._id;
    
    // Save session before sending response
    req.session.save((err) => {
      if (err) {        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Session error' });
      }
      
      res.status(201).json({
        message: 'Merchant account created successfully! Welcome to the business community.',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          userType: user.userType,
          businessInfo: user.businessInfo,
          membershipType: user.membershipType,
          membershipNumber: user.membershipNumber,
          joinDate: user.joinDate,
          preferences: user.preferences
        },        success: true
      });    
    });  
  } catch (error) {
    console.error('Merchant registration error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    
    let errorMessage = 'Server error during merchant registration';
    let statusCode = 500;
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      errorMessage = 'Validation error: ' + error.message;
      statusCode = 400;
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      errorMessage = 'A merchant with this email already exists';
      statusCode = 409;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: error.message,
      type: error.name
    });
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