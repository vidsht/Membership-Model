const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, admin, checkRole } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/admin/roles
 * @desc    Get all available roles and permissions
 * @access  Private (Admin only)
 */
router.get('/roles', auth, admin, async (req, res) => {
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
router.get('/users/:userId/role', auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('userType adminRole permissions');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      userType: user.userType,
      adminRole: user.adminRole,
      permissions: user.permissions || []
    });
  } catch (error) {
    console.error('Error fetching user role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users/:userId/assign-role
 * @desc    Assign role and permissions to user
 * @access  Private (SuperAdmin only)
 */
router.post('/users/:userId/assign-role', 
  auth, 
  checkRole('superAdmin'),
  [
    body('role').isIn(['user', 'admin', 'merchant']).withMessage('Invalid role'),
    body('adminRole').optional().isString().withMessage('Admin role must be a string'),
    body('permissions').optional().isArray().withMessage('Permissions must be an array')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { role, adminRole, permissions, merchantDetails } = req.body;
      
      // Find user
      const user = await User.findById(req.params.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update user type
      user.userType = role;
      
      // Set admin role and permissions if user is admin
      if (role === 'admin') {
        user.adminRole = adminRole || 'contentManager';
        user.permissions = permissions || [];
      }
      
      // Set merchant details if user is merchant
      if (role === 'merchant' && merchantDetails) {
        user.businessInfo = {
          ...user.businessInfo,
          ...merchantDetails
        };
      }
      
      await user.save();
      
      res.json({ 
        message: 'User role updated successfully',
        user: {
          _id: user._id,
          userType: user.userType,
          adminRole: user.adminRole,
          permissions: user.permissions
        }
      });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({ message: 'Server error' });
    }
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

module.exports = router;
