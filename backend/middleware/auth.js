const db = require('../db');

const auth = (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    db.query(
      'SELECT id, fullName, email, phone, address, profilePicture, membership, socialMediaFollowed, userType FROM users WHERE id = ?',
      [req.session.userId],
      (err, results) => {
        if (err) {
          console.error('Auth middleware SQL error:', err);
          return res.status(500).json({ message: 'Server error', error: err.message });
        }
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
      }
    );
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid session' });
  }
};

// Middleware to check if user is an admin
const admin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }

  next();
};

// Middleware to check if user is a merchant
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

module.exports = { auth, admin, merchant, checkRole, checkPermission };
