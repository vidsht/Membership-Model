// Admin routes - MySQL implementation
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { auth, admin } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

// Utility function to promisify db.query
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// @route   POST /api/admin/users/:id/assign-plan
// @desc    Assign a plan to a user (admin only)
// @access  Private (Admin only)
router.post('/users/:id/assign-plan', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { planId } = req.body;
    
    if (!userId || !planId) {
      return res.status(400).json({ success: false, message: 'User ID and plan ID are required.' });
    }

    // Get plan key from plans table
    const planRows = await queryAsync('SELECT `key` FROM plans WHERE id = ?', [planId]);
    if (!planRows.length) {
      return res.status(404).json({ success: false, message: 'Plan not found.' });
    }
    const planKey = planRows[0].key;

    // Update user with new plan
    const result = await queryAsync(
      'UPDATE users SET membershipType = ?, planAssignedAt = NOW(), planAssignedBy = ? WHERE id = ?',
      [planKey, req.user?.id || null, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Return updated user
    const userRows = await queryAsync(
      'SELECT id, fullName, email, membershipType, planAssignedAt, planAssignedBy FROM users WHERE id = ?',
      [userId]
    );

    return res.json({ success: true, user: userRows[0] });
  } catch (err) {
    console.error('Error assigning plan to user:', err);
    return res.status(500).json({ success: false, message: 'Server error assigning plan.' });
  }
});

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', auth, admin, async (req, res) => {
  try {
    // Get plan keys for counting
    const planRows = await queryAsync('SELECT `key` FROM plans WHERE isActive = TRUE ORDER BY sortOrder');
    const planKeys = planRows.map(plan => plan.key);

    // Count users by plan type
    const userPlanCounts = {};
    const merchantPlanCounts = {};
    
    for (const key of planKeys) {
      const userCount = await queryAsync(
        'SELECT COUNT(*) AS count FROM users WHERE membershipType = ? AND userType != "merchant"', [key]
      );
      userPlanCounts[key] = userCount[0].count;

      const merchantCount = await queryAsync(
        'SELECT COUNT(*) AS count FROM users WHERE membershipType = ? AND userType = "merchant"', [key]
      );
      merchantPlanCounts[key] = merchantCount[0].count;
    }

    // Get basic stats
    const totalUsers = await queryAsync('SELECT COUNT(*) AS count FROM users WHERE userType != "merchant"');
    const totalMerchants = await queryAsync('SELECT COUNT(*) AS count FROM users WHERE userType = "merchant"');
    const pendingApprovals = await queryAsync('SELECT COUNT(*) AS count FROM users WHERE status = "pending"');
    const activeBusinesses = await queryAsync('SELECT COUNT(*) AS count FROM users WHERE userType = "merchant" AND status = "approved"');

    const stats = {
      totalUsers: totalUsers[0].count,
      totalMerchants: totalMerchants[0].count,
      pendingApprovals: pendingApprovals[0].count,
      activeBusinesses: activeBusinesses[0].count,
      totalRevenue: 0, // Calculate based on plans if needed
      userPlanCounts,
      merchantPlanCounts,
      planKeys
    };

    return res.json({ success: true, stats });
  } catch (err) {
    console.error('Error fetching admin dashboard stats:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching dashboard stats.' });
  }
});

// @route   GET /api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/stats', auth, admin, async (req, res) => {
  try {
    // Get basic counts from the correct tables
    const [userCount] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE userType != "merchant"');
    const [merchantCount] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE userType = "merchant"');
    const [pendingUserApprovals] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE status = "pending" AND userType != "merchant"');
    const [pendingMerchantApprovals] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE status = "pending" AND userType = "merchant"');
    const [activeBusinesses] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE status = "approved" AND userType = "merchant"');
    const [activePlans] = await queryAsync('SELECT COUNT(*) as count FROM plans WHERE isActive = 1');
    const [totalDeals] = await queryAsync('SELECT COUNT(*) as count FROM deals WHERE status = "active"');

    // Get plan distributions using correct column names
    const userPlanCounts = await queryAsync(`
      SELECT membershipType as plan, COUNT(*) as count 
      FROM users 
      WHERE membershipType IS NOT NULL AND userType != "merchant"
      GROUP BY membershipType
    `);

    const merchantPlanCounts = await queryAsync(`
      SELECT membershipType as plan, COUNT(*) as count 
      FROM users 
      WHERE membershipType IS NOT NULL AND userType = "merchant"
      GROUP BY membershipType
    `);

    // Format plan counts as objects
    const userPlans = {};
    userPlanCounts.forEach(item => {
      userPlans[item.plan] = item.count;
    });

    const merchantPlans = {};
    merchantPlanCounts.forEach(item => {
      merchantPlans[item.plan] = item.count;
    });

    const stats = {
      totalUsers: userCount.count,
      totalMerchants: merchantCount.count,
      pendingApprovals: pendingUserApprovals.count + pendingMerchantApprovals.count,
      activeBusinesses: activeBusinesses.count,
      activePlans: activePlans.count,
      totalDeals: totalDeals.count,
      totalRevenue: 0, // TODO: Calculate from subscription payments
      userPlanCounts: userPlans,
      merchantPlanCounts: merchantPlans
    };

    res.json({ success: true, stats });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ success: false, message: 'Server error fetching statistics' });
  }
});

// @route   GET /api/admin/activities
// @desc    Get recent admin activities
// @access  Private (Admin only)
router.get('/activities', auth, admin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const activities = await queryAsync(`
      SELECT type, description, createdAt, userId, relatedId
      FROM activities 
      ORDER BY createdAt DESC 
      LIMIT ?
    `, [limit]);

    res.json({ success: true, activities });
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ success: false, message: 'Server error fetching activities' });
  }
});

// User Management Routes

// @route   GET /api/admin/users
// @desc    Get all users for admin management
// @access  Private (Admin only)
router.get('/users', auth, admin, async (req, res) => {
  try {
    const { status, userType, limit = 50, offset = 0 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    if (userType) {
      whereClause += ' AND userType = ?';
      params.push(userType);
    }
      const users = await queryAsync(`
      SELECT u.id, u.fullName, u.email, u.phone, u.address, u.community, u.membershipType, 
             u.userType, u.userCategory, u.status, u.createdAt, u.lastLogin, u.dob, 
             u.country, u.state, u.city, u.planAssignedAt, u.planAssignedBy, u.currentPlan,
             u.membershipNumber, u.validationDate, u.updated_at,
             p.name as planName, p.price as planPrice, p.billingCycle, p.currency,
             c.name as communityName
      FROM users u
      LEFT JOIN plans p ON u.membershipType = p.key
      LEFT JOIN communities c ON u.community = c.name
      ${whereClause}
      ORDER BY u.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (approve, reject, suspend)
// @access  Private (Admin only)
router.put('/users/:id/status', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await queryAsync(
      'UPDATE users SET status = ?, statusUpdatedAt = NOW(), statusUpdatedBy = ? WHERE id = ?',
      [status, req.session.userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log activity
    await queryAsync(
      'INSERT INTO activities (type, description, userId, relatedId, createdAt) VALUES (?, ?, ?, ?, NOW())',
      [`user_${status}`, `User ${status} by admin`, req.session.userId, userId]
    );

    res.json({ success: true, message: `User ${status} successfully` });
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({ success: false, message: 'Server error updating user status' });
  }
});

// @route   PUT /api/admin/users/:id/plan
// @desc    Change user's plan
// @access  Private (Admin only)
router.put('/users/:id/plan', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { planKey, customLimits, expiryDate } = req.body;

    // Verify plan exists
    const planResult = await queryAsync('SELECT * FROM plans WHERE `key` = ? AND type = "user"', [planKey]);
    if (!planResult.length) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    const plan = planResult[0];    // Update user plan using correct column names
    const updateQuery = `
      UPDATE users SET membershipType = ?, planAssignedAt = NOW(), planAssignedBy = ?
      WHERE id = ?
    `;

    await queryAsync(updateQuery, [
      planKey,
      req.session.userId,
      userId
    ]);    // Record plan history
    await queryAsync(
      'INSERT INTO user_plan_history (userId, planKey, startDate, assignedBy, reason) VALUES (?, ?, CURDATE(), ?, ?)',
      [userId, planKey, req.session.userId, 'Admin assignment']
    );

    res.json({ success: true, message: 'User plan updated successfully' });
  } catch (err) {
    console.error('Error updating user plan:', err);
    res.status(500).json({ success: false, message: 'Server error updating user plan' });
  }
});

// @route   GET /api/admin/communities
// @desc    Get all communities for registration dropdown
// @access  Public (for registration form)
router.get('/communities', async (req, res) => {
  try {
    const communities = await queryAsync('SELECT name FROM communities WHERE isActive = 1 ORDER BY name');
    const communityNames = communities.map(c => c.name);
    
    // If no communities in database, return default ones
    if (communityNames.length === 0) {
      return res.json({
        success: true,
        communities: ['Gujarati', 'Bengali', 'Tamil', 'Punjabi', 'Hindi', 'Marathi', 'Telugu', 'Kannada', 'Malayalam', 'Sindhi', 'Rajasthani', 'Other Indian', 'Mixed Heritage']
      });
    }
    
    res.json({ success: true, communities: communityNames });
  } catch (err) {
    console.error('Error fetching communities:', err);
    // Return fallback communities on error
    res.json({
      success: true,
      communities: ['Gujarati', 'Bengali', 'Tamil', 'Punjabi', 'Hindi', 'Marathi', 'Telugu', 'Kannada', 'Malayalam', 'Sindhi', 'Rajasthani', 'Other Indian', 'Mixed Heritage']
    });
  }
});

// @route   GET /api/admin/plans
// @desc    Get all available membership plans for registration
// @access  Public (for registration form)
router.get('/plans', async (req, res) => {
  try {
    const plans = await queryAsync(`
      SELECT id, name, \`key\` as type, price, currency, duration, features, 
             dealAccess, maxDeals, maxRedemptions, isActive
      FROM plans 
      WHERE isActive = 1 
      ORDER BY price ASC
    `);
    
    res.json({ success: true, plans });
  } catch (err) {
    console.error('Error fetching plans:', err);
    // Return fallback plans on error
    res.json({
      success: true,
      plans: [
        {
          id: 1,
          name: 'Community Plan',
          type: 'community',
          price: 0,
          currency: 'FREE',
          features: 'Basic directory access,Community updates,Basic support',
          dealAccess: 'Limited community deals'
        },
        {
          id: 2,
          name: 'Silver Plan',
          type: 'silver',
          price: 50,
          currency: 'GHS',
          features: 'All community features,Priority support,Exclusive deals,Event notifications',
          dealAccess: 'Silver + Community deals'
        },
        {
          id: 3,
          name: 'Gold Plan',
          type: 'gold',
          price: 150,
          currency: 'GHS',
          features: 'All silver features,VIP events,Premium support,Business networking,Priority customer service',
          dealAccess: 'All exclusive deals'        }      ]
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user information (general update)
// @access  Private (Admin only)
router.put('/users/:id', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updateData = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Build dynamic update query based on provided fields
    const allowedFields = [
      'fullName', 'email', 'phone', 'address', 'dob', 'community', 
      'country', 'state', 'city', 'membershipType', 'status', 
      'userCategory', 'currentPlan'
    ];
    
    const updates = [];
    const values = [];
    
    // Only update fields that are provided and allowed
    Object.keys(updateData).forEach(field => {
      if (allowedFields.includes(field) && updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }
    
    // Add updated_at timestamp
    updates.push('updated_at = NOW()');
    values.push(userId);
    
    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    const result = await queryAsync(updateQuery, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Return updated user data
    const updatedUser = await queryAsync(`
      SELECT u.*, c.name as communityName 
      FROM users u 
      LEFT JOIN communities c ON u.community = c.name 
      WHERE u.id = ?
    `, [userId]);
    
    res.json({ 
      success: true, 
      message: 'User updated successfully',
      user: updatedUser[0]
    });
    
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Server error updating user' });  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
// @access  Private (Admin only)
router.delete('/users/:id', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    // Check if user exists
    const userCheck = await queryAsync('SELECT id, userType FROM users WHERE id = ?', [userId]);
    if (!userCheck.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Don't allow deleting admin users
    if (userCheck[0].userType === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete admin users' });
    }
    
    // If user is a merchant, delete related business data first
    if (userCheck[0].userType === 'merchant') {
      await queryAsync('DELETE FROM businesses WHERE userId = ?', [userId]);
    }
    
    // Delete the user
    const result = await queryAsync('DELETE FROM users WHERE id = ?', [userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, message: 'User deleted successfully' });
    
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, message: 'Server error deleting user' });
  }
});

// @route   GET /api/admin/merchants
// @desc    Get all merchants with their business information
// @access  Private (Admin only)
router.get('/merchants', auth, admin, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let whereClause = 'WHERE u.userType = "merchant"';
    const params = [];
    
    if (status) {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }
    
    const merchants = await queryAsync(`
      SELECT u.id, u.fullName, u.email, u.phone, u.address, u.community, u.membershipType, 
             u.status, u.createdAt, u.lastLogin, u.dob, u.country, u.state, u.city,
             b.businessId, b.businessName, b.businessDescription, b.businessCategory,
             b.businessAddress, b.businessPhone, b.businessEmail, b.website,
             b.businessLicense, b.taxId, b.isVerified, b.verificationDate,
             b.membershipLevel, b.status as businessStatus, b.created_at as businessCreatedAt
      FROM users u
      LEFT JOIN businesses b ON u.id = b.userId  
      ${whereClause}
      ORDER BY u.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({ success: true, merchants });
  } catch (err) {
    console.error('Error fetching merchants:', err);
    res.status(500).json({ success: false, message: 'Server error fetching merchants' });
  }
});

// @route   GET /api/admin/businesses
// @desc    Get all businesses for business management
// @access  Private (Admin only)
router.get('/businesses', auth, admin, async (req, res) => {
  try {
    const { status, category, limit = 50, offset = 0 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND b.status = ?';
      params.push(status);
    }
    
    if (category) {
      whereClause += ' AND b.businessCategory = ?';
      params.push(category);
    }
    
    const businesses = await queryAsync(`
      SELECT b.*, u.fullName as ownerName, u.email as ownerEmail, u.phone as ownerPhone
      FROM businesses b
      LEFT JOIN users u ON b.userId = u.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({ success: true, businesses });
  } catch (err) {
    console.error('Error fetching businesses:', err);
    res.status(500).json({ success: false, message: 'Server error fetching businesses' });
  }
});

// @route   GET /api/admin/deals
// @desc    Get all deals for deal management
// @access  Private (Admin only)
router.get('/deals', auth, admin, async (req, res) => {
  try {
    const { status, category, businessId, limit = 50, offset = 0 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND d.status = ?';
      params.push(status);
    }
    
    if (category) {
      whereClause += ' AND d.category = ?';
      params.push(category);
    }
    
    if (businessId) {
      whereClause += ' AND d.businessId = ?';
      params.push(businessId);
    }
    
    const deals = await queryAsync(`
      SELECT d.*, b.businessName, u.fullName as merchantName
      FROM deals d
      LEFT JOIN businesses b ON d.businessId = b.businessId
      LEFT JOIN users u ON b.userId = u.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);    res.json({ success: true, deals });
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ success: false, message: 'Server error fetching deals' });  }
});

// @route   POST /api/admin/merchants/create
// @desc    Create a new merchant from admin panel
// @access  Private (Admin only)
router.post('/merchants/create', auth, admin, async (req, res) => {
  try {
    const {
      fullName, email, password = 'defaultPassword123', phone, address, community,
      country, state, city, userCategory, membershipType, status,
      businessInfo
    } = req.body;
    
    // Validate required fields
    if (!fullName || !email) {
      return res.status(400).json({ success: false, message: 'Full name and email are required' });
    }
    
    // Check if email already exists
    const existingUser = await queryAsync('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    
    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Insert user
    const userResult = await queryAsync(`
      INSERT INTO users (
        fullName, email, password, phone, address, community, country, state, city,
        userCategory, membershipType, userType, status, created_at, termsAccepted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'merchant', ?, NOW(), 1)
    `, [
      fullName, email, hashedPassword, phone || null, address || null, community || null,
      country || 'Ghana', state || null, city || null, userCategory || null,
      membershipType || 'free', status || 'approved'
    ]);
    
    const userId = userResult.insertId;
    
    // Generate membership number
    const membershipNumber = `IIG${String(userId).padStart(6, '0')}`;
    await queryAsync('UPDATE users SET membershipNumber = ? WHERE id = ?', [membershipNumber, userId]);
    
    // Create business record if business info provided
    if (businessInfo && businessInfo.businessName) {
      const businessId = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      await queryAsync(`
        INSERT INTO businesses (
          userId, businessId, businessName, businessDescription, businessCategory,
          businessAddress, businessPhone, businessEmail, website, businessLicense,
          taxId, membershipLevel, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'basic', 'active', NOW())
      `, [
        userId, businessId, businessInfo.businessName, businessInfo.businessDescription || null,
        businessInfo.businessCategory || null, businessInfo.businessAddress || null,
        businessInfo.businessPhone || null, businessInfo.businessEmail || null,
        businessInfo.website || null, businessInfo.businessLicense || null,
        businessInfo.taxId || null
      ]);
    }
    
    res.status(201).json({
      success: true,
      message: 'Merchant created successfully',
      userId: userId
    });
    
  } catch (err) {
    console.error('Error creating merchant:', err);
    res.status(500).json({ success: false, message: 'Server error creating merchant' });
  }
});

// @route   PUT /api/admin/merchants/:id
// @desc    Update merchant/business information
// @access  Private (Admin only)
router.put('/merchants/:id', auth, admin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.id);
    const updateData = req.body;
    
    // Update user information
    if (updateData.userInfo) {
      const userFields = [];
      const userParams = [];
      
      Object.keys(updateData.userInfo).forEach(field => {
        if (updateData.userInfo[field] !== undefined) {
          userFields.push(`${field} = ?`);
          userParams.push(updateData.userInfo[field]);
        }
      });
      
      if (userFields.length > 0) {
        userParams.push(merchantId);
        await queryAsync(`UPDATE users SET ${userFields.join(', ')} WHERE id = ?`, userParams);
      }
    }
    
    // Update business information
    if (updateData.businessInfo) {
      const businessFields = [];
      const businessParams = [];
      
      Object.keys(updateData.businessInfo).forEach(field => {
        if (updateData.businessInfo[field] !== undefined) {
          businessFields.push(`${field} = ?`);
          businessParams.push(updateData.businessInfo[field]);
        }
      });
      
      if (businessFields.length > 0) {
        businessParams.push(merchantId);
        await queryAsync(`UPDATE businesses SET ${businessFields.join(', ')} WHERE userId = ?`, businessParams);
      }
    }
    
    res.json({ success: true, message: 'Merchant updated successfully' });
  } catch (err) {
    console.error('Error updating merchant:', err);
    res.status(500).json({ success: false, message: 'Server error updating merchant' });
  }
});

// @route   POST /api/admin/merchants/:id/approve
// @desc    Approve a merchant
// @access  Private (Admin only)
router.post('/merchants/:id/approve', auth, admin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.id);
    
    await queryAsync('UPDATE users SET status = "approved" WHERE id = ? AND userType = "merchant"', [merchantId]);
    await queryAsync('UPDATE businesses SET status = "approved" WHERE userId = ?', [merchantId]);
    
    res.json({ success: true, message: 'Merchant approved successfully' });
  } catch (err) {
    console.error('Error approving merchant:', err);
    res.status(500).json({ success: false, message: 'Server error approving merchant' });
  }
});

// @route   POST /api/admin/merchants/:id/reject
// @desc    Reject a merchant
// @access  Private (Admin only)
router.post('/merchants/:id/reject', auth, admin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.id);
    const { reason } = req.body;
    
    await queryAsync('UPDATE users SET status = "rejected" WHERE id = ? AND userType = "merchant"', [merchantId]);
    await queryAsync('UPDATE businesses SET status = "rejected" WHERE userId = ?', [merchantId]);
    
    res.json({ success: true, message: 'Merchant rejected successfully' });
  } catch (err) {
    console.error('Error rejecting merchant:', err);
    res.status(500).json({ success: false, message: 'Server error rejecting merchant' });
  }
});

// @route   DELETE /api/admin/merchants/:id
// @desc    Delete a merchant and their business
// @access  Private (Admin only)
router.delete('/merchants/:id', auth, admin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.id);
    
    // Delete business first (foreign key constraint)
    await queryAsync('DELETE FROM businesses WHERE userId = ?', [merchantId]);
    // Delete user
    await queryAsync('DELETE FROM users WHERE id = ? AND userType = "merchant"', [merchantId]);
    
    res.json({ success: true, message: 'Merchant deleted successfully' });
  } catch (err) {
    console.error('Error deleting merchant:', err);
    res.status(500).json({ success: false, message: 'Server error deleting merchant' });
  }
});

// @route   POST /api/admin/merchants/bulk-action
// @desc    Perform bulk actions on merchants
// @access  Private (Admin only)
router.post('/merchants/bulk-action', auth, admin, async (req, res) => {
  try {
    const { action, merchantIds } = req.body;
    
    if (!action || !merchantIds || !Array.isArray(merchantIds)) {
      return res.status(400).json({ success: false, message: 'Invalid request data' });
    }
    
    const placeholders = merchantIds.map(() => '?').join(',');
    
    switch (action) {
      case 'approve':
        await queryAsync(`UPDATE users SET status = "approved" WHERE id IN (${placeholders}) AND userType = "merchant"`, merchantIds);
        await queryAsync(`UPDATE businesses SET status = "approved" WHERE userId IN (${placeholders})`, merchantIds);
        break;
      case 'reject':
        await queryAsync(`UPDATE users SET status = "rejected" WHERE id IN (${placeholders}) AND userType = "merchant"`, merchantIds);
        await queryAsync(`UPDATE businesses SET status = "rejected" WHERE userId IN (${placeholders})`, merchantIds);
        break;
      case 'suspend':
        await queryAsync(`UPDATE users SET status = "suspended" WHERE id IN (${placeholders}) AND userType = "merchant"`, merchantIds);
        await queryAsync(`UPDATE businesses SET status = "suspended" WHERE userId IN (${placeholders})`, merchantIds);
        break;
      case 'delete':
        await queryAsync(`DELETE FROM businesses WHERE userId IN (${placeholders})`, merchantIds);
        await queryAsync(`DELETE FROM users WHERE id IN (${placeholders}) AND userType = "merchant"`, merchantIds);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    
    res.json({ success: true, message: `Bulk ${action} completed successfully` });
  } catch (err) {
    console.error('Error performing bulk action:', err);
    res.status(500).json({ success: false, message: 'Server error performing bulk action' });  }
});

// @route   PATCH /api/admin/deals/:id/status
// @desc    Update deal status
// @access  Private (Admin only)
router.patch('/deals/:id/status', auth, admin, async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    
    const result = await queryAsync('UPDATE deals SET status = ? WHERE id = ?', [status, dealId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }
    
    res.json({ success: true, message: 'Deal status updated successfully' });
  } catch (err) {
    console.error('Error updating deal status:', err);
    res.status(500).json({ success: false, message: 'Server error updating deal status' });
  }
});

// @route   DELETE /api/admin/deals/:id
// @desc    Delete a deal
// @access  Private (Admin only)
router.delete('/deals/:id', auth, admin, async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);
    
    const result = await queryAsync('DELETE FROM deals WHERE id = ?', [dealId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }
    
    res.json({ success: true, message: 'Deal deleted successfully' });
  } catch (err) {
    console.error('Error deleting deal:', err);
    res.status(500).json({ success: false, message: 'Server error deleting deal' });
  }
});

// @route   GET /api/admin/deals/:id
// @desc    Get a single deal by ID for editing
// @access  Private (Admin only)
router.get('/deals/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deal = await queryAsync(`
      SELECT d.*, b.businessName, b.businessId, u.fullName as businessOwner
      FROM deals d
      LEFT JOIN businesses b ON d.businessId = b.businessId
      LEFT JOIN users u ON b.userId = u.id
      WHERE d.id = ?
    `, [id]);

    if (deal.length === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    res.json({ success: true, deal: deal[0] });
  } catch (err) {
    console.error('Error fetching deal:', err);
    res.status(500).json({ success: false, message: 'Server error fetching deal' });
  }
});

// @route   GET /api/admin/deals/:id/redemptions
// @desc    Get redemptions for a specific deal
// @access  Private (Admin only)
router.get('/deals/:id/redemptions', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;    const redemptions = await queryAsync(`
      SELECT dr.*, u.fullName as userName, u.email as userEmail, 
             d.title as dealTitle, d.description as dealDescription
      FROM deal_redemptions dr
      JOIN users u ON dr.user_id = u.id
      JOIN deals d ON dr.deal_id = d.id
      WHERE dr.deal_id = ?
      ORDER BY dr.redeemed_at DESC
    `, [id]);

    res.json({ success: true, redemptions });
  } catch (err) {
    console.error('Error fetching deal redemptions:', err);
    res.status(500).json({ success: false, message: 'Server error fetching redemptions' });
  }
});

module.exports = router;
