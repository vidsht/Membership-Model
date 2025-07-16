const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const router = express.Router();

// MySQL-based checkRole middleware
function checkRole(requiredRole) {
  return (req, res, next) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    db.query('SELECT adminRole FROM users WHERE id = ?', [userId], (err, results) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!results.length) return res.status(403).json({ message: 'User not found' });
      const userRole = results[0].adminRole;
      if (userRole !== requiredRole) {
        return res.status(403).json({ message: 'Forbidden: Insufficient role' });
      }
      next();
    });
  };
}

// MySQL-based admin middleware for permissions
function admin(req, res, next) {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  db.query('SELECT adminRole FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!results.length) return res.status(403).json({ message: 'User not found' });
    const userRole = results[0].adminRole;
    if (!userRole || (userRole !== 'admin' && userRole !== 'superAdmin')) {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }
    next();
  });
}

/**
 * @route   GET /api/admin/roles
 * @desc    Get all available roles and permissions
 * @access  Private (Admin only)
 */
router.get('/roles', auth, (req, res) => {
  try {
    // Define available roles and their permissions
    const roles = {
      superAdmin: {
        description: 'Full system access with all permissions',
        permissions: [
          'manage_users',
          'manage_plans',
          'manage_partners',
          'manage_settings',
          'manage_deals',
          'manage_roles',
          'manage_system',
          'view_analytics',
          'approve_users',
          'approve_partners'
        ]
      },
      userManager: {
        description: 'Manages user accounts and approvals',
        permissions: [
          'manage_users',
          'view_users',
          'approve_users'
        ]
      },
      contentManager: {
        description: 'Manages deals and partner content',
        permissions: [
          'manage_deals',
          'view_deals',
          'view_partners',
          'manage_partners'
        ]
      },
      analyst: {
        description: 'Views analytics and reports',
        permissions: [
          'view_analytics',
          'view_users',
          'view_deals',
          'view_partners'
        ]
      }
    };
    
    res.json({ roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/users/:userId/role
 * @desc    Get user role and permissions
 * @access  Private (Admin only)
 */
router.get('/users/:userId/role', auth, (req, res) => {
  db.query('SELECT userType, adminRole, permissions FROM users WHERE id = ?', [req.params.userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!results.length) return res.status(404).json({ message: 'User not found' });
    const user = results[0];
    res.json({
      userType: user.userType,
      adminRole: user.adminRole,
      permissions: user.permissions ? JSON.parse(user.permissions) : []
    });
  });
});

/**
 * @route   POST /api/admin/users/:userId/assign-role
 * @desc    Assign role and permissions to user
 * @access  Private (SuperAdmin only)
 */
router.post('/users/:userId/assign-role',
  auth,
  checkRole('superAdmin'),
  (req, res) => {
    const { role, adminRole, permissions } = req.body;
    db.query('UPDATE users SET userType=?, adminRole=?, permissions=? WHERE id=?',
      [role, adminRole, JSON.stringify(permissions || []), req.params.userId],
      (err) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'Role and permissions assigned' });
      }
    );
  }
);

/**
 * @route   GET /api/admin/roles/permissions
 * @desc    Get all available permissions
 * @access  Private (Admin only)
 */
router.get('/roles/permissions', auth, admin, async (req, res) => {
  try {
    const permissions = [
      {
        id: 'manage_users',
        name: 'Manage Users',
        description: 'Create, edit, and delete user accounts'
      },
      {
        id: 'view_users',
        name: 'View Users',
        description: 'View user accounts and information'
      },
      {
        id: 'approve_users',
        name: 'Approve Users',
        description: 'Approve new user registrations'
      },
      {
        id: 'manage_plans',
        name: 'Manage Plans',
        description: 'Create, edit, and delete membership plans'
      },
      {
        id: 'manage_partners',
        name: 'Manage Partners',
        description: 'Create, edit, and delete business partners'
      },
      {
        id: 'view_partners',
        name: 'View Partners',
        description: 'View business partner information'
      },
      {
        id: 'approve_partners',
        name: 'Approve Partners',
        description: 'Approve new business partner registrations'
      },
      {
        id: 'manage_deals',
        name: 'Manage Deals',
        description: 'Create, edit, and delete deals'
      },
      {
        id: 'view_deals',
        name: 'View Deals',
        description: 'View deal information'
      },
      {
        id: 'manage_settings',
        name: 'Manage Settings',
        description: 'Edit system settings'
      },
      {
        id: 'manage_roles',
        name: 'Manage Roles',
        description: 'Assign roles and permissions'
      },
      {
        id: 'manage_system',
        name: 'Manage System',
        description: 'Access to system-wide configuration'
      },
      {
        id: 'view_analytics',
        name: 'View Analytics',
        description: 'View system analytics and reports'
      }
    ];
    
    res.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all roles
router.get('/', auth, (req, res) => {
  db.query('SELECT * FROM roles', (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(results);
  });
});

// Assign role to user
router.post('/assign', auth, (req, res) => {
  const { userId, role } = req.body;
  db.query('UPDATE users SET role=? WHERE id=?', [role, userId], (err) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json({ message: 'Role assigned' });
  });
});

module.exports = router;
