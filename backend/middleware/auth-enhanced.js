const db = require('./db');
const { DatabaseConnectionWrapper } = require('./database-health-monitor');

const auth = (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }
    
    // Use the enhanced query wrapper with retry logic
    DatabaseConnectionWrapper.queryWithRetry(
      'SELECT id, fullName, email, phone, address, profilePicture, membership, socialMediaFollowed, userType, adminRole, permissions FROM users WHERE id = ?',
      [req.session.userId]
    )
    .then(results => {
      if (!results.length) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      const user = results[0];
      if (user.socialMediaFollowed) {
        try {
          user.socialMediaFollowed = JSON.parse(user.socialMediaFollowed);
        } catch (e) {
          user.socialMediaFollowed = {};
        }
      }
      req.user = user;
      next();
    })
    .catch(err => {
      console.error('Auth middleware SQL error:', err);
      
      // Provide more specific error messages based on error type
      if (err.code === 'ETIMEDOUT') {
        return res.status(503).json({ 
          message: 'Database service temporarily unavailable. Please try again.',
          error: 'DATABASE_TIMEOUT'
        });
      } else if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          message: 'Database service unavailable. Please try again later.',
          error: 'DATABASE_UNAVAILABLE'
        });
      } else {
        return res.status(500).json({ 
          message: 'Server error checking user access',
          error: 'DATABASE_ERROR'
        });
      }
    });
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error checking user access' });
  }
};

// Enhanced middleware to check if user is an admin with retry logic
const admin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }

  next();
};

// Enhanced middleware to check if user is a merchant
const merchant = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.userType !== 'merchant') {
    return res.status(403).json({ message: 'Access denied. Merchant privileges required.' });
  }

  next();
};

// Role-based middleware for granular permissions
const checkRole = (requiredRole) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // If user is super admin, allow all access
    if (req.user.userType === 'admin' && req.user.adminRole === 'superAdmin') {
      return next();
    }
    
    // If user is admin but role doesn't match required role
    if (req.user.userType === 'admin' && req.user.adminRole !== requiredRole) {
      return res.status(403).json({ 
        message: `Access denied. '${requiredRole}' role privileges required.` 
      });
    }
    
    // User is not an admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    next();
  };
};

// Permission-based middleware for specific actions
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // If user is super admin, allow all permissions
    if (req.user.userType === 'admin' && req.user.adminRole === 'superAdmin') {
      return next();
    }
    
    // Check if user has the specific permission
    if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        message: `Access denied. You don't have the required permission: ${requiredPermission}.` 
      });
    }
    
    next();
  };
};

// Database error handling middleware
const handleDatabaseError = (err, req, res, next) => {
  console.error('Database middleware error:', err);
  
  if (err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      success: false,
      message: 'Database request timed out. Please try again.',
      error: 'DATABASE_TIMEOUT',
      retryAfter: 5
    });
  }
  
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      message: 'Database service temporarily unavailable.',
      error: 'DATABASE_UNAVAILABLE',
      retryAfter: 30
    });
  }
  
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    return res.status(503).json({
      success: false,
      message: 'Connection to database lost. Please retry your request.',
      error: 'CONNECTION_LOST',
      retryAfter: 10
    });
  }
  
  if (err.code === 'ER_TOO_MANY_CONNECTIONS') {
    return res.status(503).json({
      success: false,
      message: 'Database is currently at capacity. Please try again in a moment.',
      error: 'DATABASE_OVERLOADED',
      retryAfter: 15
    });
  }
  
  // Generic database error
  res.status(500).json({
    success: false,
    message: 'A database error occurred. Please try again.',
    error: 'DATABASE_ERROR'
  });
};

module.exports = { 
  auth, 
  admin, 
  merchant, 
  checkRole, 
  checkPermission, 
  handleDatabaseError 
};