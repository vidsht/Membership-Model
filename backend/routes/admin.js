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
  try {    // Get basic counts from the correct tables
    const [userCount] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE userType != "merchant"');
    const [merchantCount] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE userType = "merchant"');
    const [pendingUserApprovals] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE status = "pending" AND userType != "merchant"');
    const [pendingMerchantApprovals] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE status = "pending" AND userType = "merchant"');
    const [activeBusinesses] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE status = "approved" AND userType = "merchant"');
    const [totalDeals] = await queryAsync('SELECT COUNT(*) as count FROM deals WHERE status = "active"');

    const stats = {
      totalUsers: userCount.count,
      totalMerchants: merchantCount.count,
      pendingApprovals: pendingUserApprovals.count + pendingMerchantApprovals.count,
      activeBusinesses: activeBusinesses.count,
      totalDeals: totalDeals.count,
      totalRevenue: 0 // TODO: Calculate from subscription payments
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
    // Use correct columns from the actual activities table
    const activities = await queryAsync(`
      SELECT 
        id,
        type,
        title,
        description,
        userId,
        userName,
        userEmail,
        userType,
        timestamp AS createdAt,
        icon
      FROM activities
      ORDER BY timestamp DESC
      LIMIT ?
    `, [limit]);

    // Format activities for frontend (add user object)
    const formatted = activities.map(act => ({
      id: act.id,
      type: act.type,
      title: act.title,
      description: act.description,
      createdAt: act.createdAt,
      icon: act.icon,
      user: act.userId ? {
        id: act.userId,
        fullName: act.userName,
        email: act.userEmail,
        userType: act.userType
      } : null
    }));

    res.json({ success: true, activities: formatted });
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ success: false, message: 'Server error fetching activities' });
  }
});

// User Management Routes

// @route   GET /api/admin/users
// @desc    Get all users for admin management with advanced filtering and pagination
// @access  Private (Admin only)
router.get('/users', auth, admin, async (req, res) => {
  try {
    const { 
      status, 
      userType, 
      membershipType,
      search,
      dateFrom,
      dateTo,
      page = 1, 
      limit = 10 
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    // Status filter
    if (status && status !== 'all') {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }
    
    // User type filter
    if (userType && userType !== 'all') {
      whereClause += ' AND u.userType = ?';
      params.push(userType);
    }

    // Membership type filter
    if (membershipType && membershipType !== 'all') {
      if (membershipType === 'none') {
        whereClause += ' AND (u.membershipType IS NULL OR u.membershipType = "")';
      } else {
        whereClause += ' AND u.membershipType = ?';
        params.push(membershipType);
      }
    }

    // Search filter (name, email, phone)
    if (search && search.trim()) {
      whereClause += ' AND (u.fullName LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Date range filter
    if (dateFrom) {
      whereClause += ' AND DATE(u.createdAt) >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      whereClause += ' AND DATE(u.createdAt) <= ?';
      params.push(dateTo);
    }

    // Calculate pagination
    const currentPage = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const offset = (currentPage - 1) * pageSize;

    // Get total count
    const countResult = await queryAsync(`
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `, params);
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / pageSize);

    // Get users with pagination
    const users = await queryAsync(`
      SELECT u.id, u.fullName, u.email, u.phone, u.address, u.community, u.membershipType, 
             u.userType, u.userCategory, u.status, u.createdAt, u.lastLogin, u.dob, 
             u.country, u.state, u.city, u.planAssignedAt, u.planAssignedBy, u.currentPlan,
             u.membershipNumber, u.validationDate, u.updated_at,
             p.name as planName, p.price as planPrice, p.billingCycle, p.currency,
             p.features,
             c.name as communityName
      FROM users u
      LEFT JOIN plans p ON u.membershipType = p.key
      LEFT JOIN communities c ON u.community = c.name
      ${whereClause}
      ORDER BY u.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]);

    // Process users data to parse JSON address and calculate plan expiry
    const processedUsers = users.map(user => {
      let processedUser = { ...user };
      
      // Parse address if it's a JSON string
      if (user.address && typeof user.address === 'string') {
        try {
          const addressObj = JSON.parse(user.address);
          processedUser.address = addressObj.street || addressObj.address || user.address;
          if (!processedUser.city && addressObj.city) processedUser.city = addressObj.city;
          if (!processedUser.state && addressObj.state) processedUser.state = addressObj.state;
          if (!processedUser.country && addressObj.country) processedUser.country = addressObj.country;
        } catch (e) {
          // If parsing fails, keep original address
          processedUser.address = user.address;
        }
      }
      
      // Set plan expiry date - validationDate is the plan expiry
      processedUser.planExpiryDate = user.validationDate;
      
      return processedUser;
    });

    res.json({ 
      success: true, 
      users: processedUsers,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: total,
        totalPages: totalPages
      },
      total: total,
      totalPages: totalPages
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get a specific user by ID
// @access  Private (Admin only)
router.get('/users/:id', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required.' });
    }

    const userRows = await queryAsync(`
      SELECT u.id, u.fullName, u.email, u.phone, u.address, u.community, u.membershipType, 
             u.userType, u.userCategory, u.status, u.createdAt, u.lastLogin, u.dob, 
             u.country, u.state, u.city, u.planAssignedAt, u.planAssignedBy, u.currentPlan,
             u.membershipNumber, u.validationDate, u.updated_at,
             p.name as planName, p.price as planPrice, p.billingCycle, p.currency,
             p.features,
             c.name as communityName
      FROM users u
      LEFT JOIN plans p ON u.membershipType = p.key
      LEFT JOIN communities c ON u.community = c.name
      WHERE u.id = ?
    `, [userId]);

    if (!userRows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userRows[0];
    
    // Parse address if it's a JSON string
    if (user.address && typeof user.address === 'string') {
      try {
        const addressObj = JSON.parse(user.address);
        user.address = addressObj.street || addressObj.address || user.address;
        if (!user.city && addressObj.city) user.city = addressObj.city;
        if (!user.state && addressObj.state) user.state = addressObj.state;
        if (!user.country && addressObj.country) user.country = addressObj.country;
      } catch (e) {
        // If parsing fails, keep original address
      }
    }
    
    // Set plan expiry date
    user.planExpiryDate = user.validationDate;

    res.json({ success: true, user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ success: false, message: 'Server error fetching user.' });
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
// @desc    Get all communities for admin management
// @access  Private (Admin only)
router.get('/communities', auth, admin, async (req, res) => {
  try {
    const communities = await queryAsync('SELECT * FROM communities ORDER BY displayOrder, name');
    
    // If no communities in database, return default ones
    if (communities.length === 0) {
      return res.json({
        success: true,
        communities: [
          { name: 'Gujarati', isActive: true },
          { name: 'Bengali', isActive: true },
          { name: 'Tamil', isActive: true },
          { name: 'Punjabi', isActive: true },
          { name: 'Hindi', isActive: true },
          { name: 'Marathi', isActive: true },
          { name: 'Telugu', isActive: true },
          { name: 'Kannada', isActive: true },
          { name: 'Malayalam', isActive: true },
          { name: 'Sindhi', isActive: true },
          { name: 'Rajasthani', isActive: true },
          { name: 'Other Indian', isActive: true },
          { name: 'Mixed Heritage', isActive: true }
        ]
      });
    }
    
    res.json({ success: true, communities });
  } catch (err) {
    console.error('Error fetching communities:', err);
    // Return fallback communities on error
    res.json({
      success: true,
      communities: [
        { name: 'Gujarati', isActive: true },
        { name: 'Bengali', isActive: true },
        { name: 'Tamil', isActive: true },
        { name: 'Punjabi', isActive: true },
        { name: 'Hindi', isActive: true },
        { name: 'Marathi', isActive: true },
        { name: 'Telugu', isActive: true },
        { name: 'Kannada', isActive: true },
        { name: 'Malayalam', isActive: true },
        { name: 'Sindhi', isActive: true },
        { name: 'Rajasthani', isActive: true },
        { name: 'Other Indian', isActive: true },
        { name: 'Mixed Heritage', isActive: true }
      ]
    });
  }
});

// @route   GET /api/admin/plans
// @desc    Get all membership plans for admin management
// @access  Private (Admin only)
router.get('/plans', auth, admin, async (req, res) => {
  try {
    const plans = await queryAsync(`
      SELECT id, \`key\`, name, description, price, currency, billingCycle, 
             features, dealAccess, type, isActive, priority, created_at
      FROM plans 
      ORDER BY priority ASC, name ASC
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
          key: 'community',
          name: 'Community Plan',
          type: 'community',
          price: 0,
          currency: 'FREE',
          features: 'Basic directory access,Community updates,Basic support',
          dealAccess: 'Limited community deals',
          isActive: true
        },
        {
          id: 2,
          key: 'silver',
          name: 'Silver Plan',
          type: 'silver',
          price: 50,
          currency: 'GHS',
          features: 'All community features,Priority support,Exclusive deals,Event notifications',
          dealAccess: 'Silver + Community deals',
          isActive: true
        },
        {
          id: 3,
          key: 'gold',
          name: 'Gold Plan',
          type: 'gold',
          price: 150,
          currency: 'GHS',
          features: 'All silver features,VIP events,Premium support,Business networking,Priority customer service',
          dealAccess: 'All exclusive deals',
          isActive: true
        }
      ]
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
    }      const merchants = await queryAsync(`
      SELECT u.id, u.fullName, u.email, u.phone, u.address, u.community, u.membershipType, 
             u.status, u.createdAt, u.lastLogin, u.dob, u.userCategory, u.currentPlan,
             u.membershipNumber, u.validationDate,
             b.businessId, b.businessName, b.businessDescription, b.businessCategory,
             b.businessAddress, b.businessPhone, b.businessEmail, b.website,
             b.businessLicense, b.taxId, b.membershipLevel, b.status as businessStatus, 
             b.created_at as businessCreatedAt, b.currentPlan as businessPlan,
             b.planExpiryDate, b.planStatus, b.customDealLimit, b.dealsUsedThisMonth
      FROM users u
      LEFT JOIN businesses b ON u.id = b.userId  
      ${whereClause}
      ORDER BY u.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Process merchants data to parse JSON address
    const processedMerchants = merchants.map(merchant => {
      let processedMerchant = { ...merchant };
      
      // Parse address if it's a JSON string
      if (merchant.address && typeof merchant.address === 'string') {
        try {
          const addressObj = JSON.parse(merchant.address);
          processedMerchant.address = addressObj.street || addressObj.address || merchant.address;
        } catch (e) {
          // If parsing fails, keep original address
          processedMerchant.address = merchant.address;
        }
      }
      
      // Set plan expiry date - validationDate is the plan expiry
      processedMerchant.planExpiryDate = merchant.validationDate;
      
      return processedMerchant;
    });

    res.json({ success: true, merchants: processedMerchants });
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
// @desc    Get all deals for deal management with advanced filtering
// @access  Private (Admin only)
router.get('/deals', auth, admin, async (req, res) => {
  try {
    const { 
      status, 
      category, 
      businessId, 
      discountType,
      search,
      validFrom,
      validTo,
      minDiscount,
      maxDiscount,
      hasRedemptions,
      sortBy = 'created_at',
      sortOrder = 'desc',
      limit = 50, 
      offset = 0 
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    // Status filter
    if (status) {
      whereClause += ' AND d.status = ?';
      params.push(status);
    }
    
    // Category filter
    if (category) {
      whereClause += ' AND d.category = ?';
      params.push(category);
    }
    
    // Business filter
    if (businessId) {
      whereClause += ' AND d.businessId = ?';
      params.push(businessId);
    }
    
    // Discount type filter
    if (discountType) {
      whereClause += ' AND d.discountType = ?';
      params.push(discountType);
    }
    
    // Search filter
    if (search) {
      whereClause += ' AND (d.title LIKE ? OR d.description LIKE ? OR b.businessName LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Date range filters
    if (validFrom) {
      whereClause += ' AND d.validUntil >= ?';
      params.push(validFrom);
    }
    
    if (validTo) {
      whereClause += ' AND d.validUntil <= ?';
      params.push(validTo);
    }
    
    // Discount range filters
    if (minDiscount) {
      whereClause += ' AND d.discount >= ?';
      params.push(parseInt(minDiscount));
    }
    
    if (maxDiscount) {
      whereClause += ' AND d.discount <= ?';
      params.push(parseInt(maxDiscount));
    }
    
    // Redemptions filter
    if (hasRedemptions === 'yes') {
      whereClause += ' AND redemption_count > 0';
    } else if (hasRedemptions === 'no') {
      whereClause += ' AND (redemption_count = 0 OR redemption_count IS NULL)';
    } else if (hasRedemptions === 'high') {
      whereClause += ' AND redemption_count >= 10';
    }
    
    // Validate sort parameters
    const validSortFields = ['created_at', 'title', 'discount', 'validUntil', 'status', 'redemptions'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    // Map sort fields to actual column names
    let orderByField = sortField;
    if (sortField === 'redemptions') {
      orderByField = 'redemption_count';
    }
      const deals = await queryAsync(`
      SELECT d.*, 
             b.businessName, 
             b.businessCategory,
             b.businessPhone,
             b.businessEmail,
             b.website,
             b.businessAddress,
             b.businessDescription,             b.isVerified,
             b.status as businessStatus,
             u.fullName as merchantName,
             u.email as merchantEmail,
             u.phone as merchantPhone,
             COALESCE((SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id), 0) as redemptionCount,
             (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND DATE(dr.redeemed_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as monthlyRedemptions,
             (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND DATE(dr.redeemed_at) = CURDATE()) as todayRedemptions
      FROM deals d
      LEFT JOIN businesses b ON d.businessId = b.businessId
      LEFT JOIN users u ON b.userId = u.id
      LEFT JOIN (
        SELECT deal_id, COUNT(*) as redemption_count 
        FROM deal_redemptions 
        GROUP BY deal_id
      ) dr ON d.id = dr.deal_id
      ${whereClause}
      ORDER BY ${orderByField} ${sortDirection}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({ success: true, deals });
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ success: false, message: 'Server error fetching deals' });
  }
});

// @route   POST /api/admin/deals
// @desc    Create a new deal from admin panel
// @access  Private (Admin only)
router.post('/deals', auth, admin, async (req, res) => {
  try {    const {
      title,
      description,
      businessId,
      category,
      discount,
      discountType,
      originalPrice,
      discountedPrice,
      termsConditions,
      validFrom,
      validUntil,
      couponCode,
      imageUrl,
      requiredPlanPriority,
      status = 'active'
    } = req.body;

    // Validate required fields
    if (!title || !description || !businessId || !discount || !discountType) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, business ID, discount, and discount type are required'
      });
    }

    // Verify business exists
    const business = await queryAsync(
      'SELECT businessId FROM businesses WHERE businessId = ?',
      [businessId]
    );

    if (business.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid business ID'
      });
    }    // Calculate discounted price if not provided
    let finalDiscountedPrice = discountedPrice;
    if (originalPrice && discount && discountType === 'percentage' && !discountedPrice) {
      finalDiscountedPrice = originalPrice * (1 - discount / 100);
    }

    // Get plan information for accessLevel field (for display purposes)
    let planName = null;
    if (requiredPlanPriority) {
      const planResults = await queryAsync(
        'SELECT name FROM plans WHERE priority = ? AND type = "user" AND isActive = 1 LIMIT 1',
        [requiredPlanPriority]
      );
      if (planResults.length > 0) {
        planName = planResults[0].name;
      }
    }

    // Insert deal
    const result = await queryAsync(`
      INSERT INTO deals (
        businessId, title, description, category, discount, discountType,
        originalPrice, discountedPrice, termsConditions, validFrom, validUntil,
        couponCode, imageUrl, minPlanPriority, accessLevel, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      businessId,
      title,
      description,
      category || 'general',
      discount,
      discountType,
      originalPrice || null,
      finalDiscountedPrice || null,
      termsConditions || '',
      validFrom || null,
      validUntil || null,      couponCode || null,
      imageUrl || null,
      requiredPlanPriority || 1, // For access control logic
      planName || 'Community', // For display purposes
      status
    ]);

    // Get the created deal with business info
    const createdDeal = await queryAsync(`
      SELECT d.*, b.businessName, u.fullName as merchantName
      FROM deals d
      LEFT JOIN businesses b ON d.businessId = b.businessId
      LEFT JOIN users u ON b.userId = u.id
      WHERE d.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      deal: createdDeal[0]
    });

  } catch (err) {
    console.error('Error creating deal:', err);
    res.status(500).json({ success: false, message: 'Server error creating deal' });
  }
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
    const dealRows = await queryAsync(`
      SELECT d.*, 
             b.businessName, 
             b.businessId, 
             b.businessCategory,
             b.businessPhone,
             b.businessEmail,
             b.website,
             b.businessAddress,
             b.businessDescription,
             b.businessLicense,
             b.taxId,
             b.isVerified,
             b.verificationDate,
             b.membershipLevel as businessMembershipLevel,
             b.status as businessStatus, b.created_at as businessCreatedAt,
             u.fullName as businessOwner,
             u.email as ownerEmail,
             u.phone as ownerPhone,
             u.address as ownerAddress,
             u.city as ownerCity,
             u.state as ownerState,
             u.country as ownerCountry,
             u.profilePicture as ownerProfilePicture,
             COALESCE((SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id), 0) as redemptionCount,
             (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND DATE(dr.redeemed_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as monthlyRedemptions,
             (SELECT COUNT(*) FROM deal_redemptions dr WHERE dr.deal_id = d.id AND DATE(dr.redeemed_at) = CURDATE()) as todayRedemptions
      FROM deals d
      LEFT JOIN businesses b ON d.businessId = b.businessId
      LEFT JOIN users u ON b.userId = u.id
      WHERE d.id = ?
    `, [id]);

    if (dealRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }
    // Always return all expected fields with fallback values
    const d = dealRows[0];
    const deal = {
      id: d.id,
      title: d.title || '',
      description: d.description || '',
      businessId: d.businessId || '',
      businessName: d.businessName || '',
      businessCategory: d.businessCategory || '',
      businessPhone: d.businessPhone || '',
      businessEmail: d.businessEmail || '',
      website: d.website || '',
      businessAddress: d.businessAddress || '',
      businessDescription: d.businessDescription || '',
      businessLicense: d.businessLicense || '',
      taxId: d.taxId || '',
      isVerified: !!d.isVerified,
      verificationDate: d.verificationDate || '',
      businessMembershipLevel: d.businessMembershipLevel || '',
      businessStatus: d.businessStatus || '',
      businessCreatedAt: d.businessCreatedAt || '',
      businessOwner: d.businessOwner || '',
      ownerEmail: d.ownerEmail || '',
      ownerPhone: d.ownerPhone || '',
      ownerAddress: d.ownerAddress || '',
      ownerCity: d.ownerCity || '',
      ownerState: d.ownerState || '',
      ownerCountry: d.ownerCountry || '',
      ownerProfilePicture: d.ownerProfilePicture || '',
      redemptionCount: d.redemptionCount || 0,
      monthlyRedemptions: d.monthlyRedemptions || 0,
      todayRedemptions: d.todayRedemptions || 0,
      category: d.category || '',
      discount: d.discount || 0,
      discountType: d.discountType || '',
      originalPrice: d.originalPrice || 0,
      discountedPrice: d.discountedPrice || 0,
      imageUrl: d.imageUrl || '',
      validFrom: d.validFrom || '',
      validUntil: d.validUntil || '',
      expiration_date: d.expiration_date || '',
      status: d.status || '',
      createdAt: d.created_at || '',
      termsConditions: d.termsConditions || '',
      views: d.views || 0,
      minPlanPriority: d.minPlanPriority || 0,
      couponCode: d.couponCode || '',
      accessLevel: d.accessLevel || '',
      maxRedemptions: d.maxRedemptions || 0
    };
    res.json({ success: true, deal });
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
    const { id } = req.params;
    const redemptionsRows = await queryAsync(`
      SELECT dr.*, u.fullName as userName, u.email as userEmail, u.phone as userPhone, u.profilePicture as userProfilePicture,
             d.title as dealTitle, d.description as dealDescription
      FROM deal_redemptions dr
      JOIN users u ON dr.user_id = u.id
      JOIN deals d ON dr.deal_id = d.id
      WHERE dr.deal_id = ?
      ORDER BY dr.redeemed_at DESC
    `, [id]);

    // Always return all expected fields with fallback values
    const redemptions = redemptionsRows.map(r => ({
      id: r.id || r._id || '',
      userId: r.user_id || '',
      userName: r.userName || '',
      userEmail: r.userEmail || '',
      userPhone: r.userPhone || '',
      userProfilePicture: r.userProfilePicture || '',
      dealTitle: r.dealTitle || '',
      dealDescription: r.dealDescription || '',
      redeemedAt: r.redeemed_at || '',
      status: r.status || 'redeemed',
    }));
    res.json({ success: true, redemptions });
  } catch (err) {
    console.error('Error fetching deal redemptions:', err);
    res.status(500).json({ success: false, message: 'Server error fetching redemptions' });
  }
});

// @route   PUT/PATCH /api/admin/redemptions/:id/status
// @desc    Update redemption status (mark as used/pending)
// @access  Private (Admin only)
router.put('/redemptions/:id/status', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'used'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be "pending" or "used"' 
      });
    }

    // Update the redemption status
    const result = await queryAsync(`
      UPDATE deal_redemptions 
      SET status = ?, updated_at = NOW()
      WHERE id = ?
    `, [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Redemption not found' 
      });
    }

    // Get the updated redemption with deal and user info
    const updatedRedemption = await queryAsync(`
      SELECT dr.*, 
             u.fullName, u.email, u.phone,
             d.title as dealTitle
      FROM deal_redemptions dr
      LEFT JOIN users u ON dr.userId = u.id
      LEFT JOIN deals d ON dr.dealId = d.id
      WHERE dr.id = ?
    `, [id]);

    res.json({ 
      success: true, 
      message: `Redemption marked as ${status}`,
      redemption: updatedRedemption[0]
    });
  } catch (err) {
    console.error('Error updating redemption status:', err);
    res.status(500).json({ success: false, message: 'Server error updating redemption' });
  }
});

// Enhanced redemption status update with notification
router.patch('/redemptions/:id/status', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'used'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be "pending" or "used"' 
      });
    }

    const result = await queryAsync(`
      UPDATE deal_redemptions 
      SET status = ?
      WHERE id = ?
    `, [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Redemption not found' 
      });
    }

    // Get the updated redemption with deal and user info
    const updatedRedemption = await queryAsync(`
      SELECT dr.*, 
             u.fullName, u.email, u.phone,
             d.title as dealTitle
      FROM deal_redemptions dr
      LEFT JOIN users u ON dr.userId = u.id
      LEFT JOIN deals d ON dr.dealId = d.id
      WHERE dr.id = ?
    `, [id]);

    res.json({ 
      success: true, 
      message: `Redemption marked as ${status}`,
      redemption: updatedRedemption[0]
    });
  } catch (err) {
    console.error('Error updating redemption status:', err);
    res.status(500).json({ success: false, message: 'Server error updating redemption' });
  }
});

// Advanced Plan Management Routes

// @route   PUT /api/admin/users/:id/plan-advanced
// @desc    Assign plan to user with custom overrides
// @access  Private (Admin only)
router.put('/users/:id/plan-advanced', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { 
      planKey, 
      customRedemptionLimit, 
      customExpiryDate, 
      customFeatures,
      notes 
    } = req.body;

    if (!planKey) {
      return res.status(400).json({ success: false, message: 'Plan key is required' });
    }

    // Verify plan exists and is a user plan
    const planResult = await queryAsync('SELECT * FROM plans WHERE `key` = ? AND type = "user" AND isActive = 1', [planKey]);
    if (!planResult.length) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive user plan' });
    }

    const plan = planResult[0];
    const expiryDate = customExpiryDate || (plan.billingCycle === 'monthly' ? 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : 
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

    // Update user with plan and custom settings
    await queryAsync(`
      UPDATE users SET 
        membershipType = ?, 
        planAssignedAt = NOW(), 
        planAssignedBy = ?,
        customRedemptionLimit = ?,
        validationDate = ?,
        planStatus = 'active',
        planNotes = ?
      WHERE id = ?
    `, [
      planKey, 
      req.session.userId, 
      customRedemptionLimit || plan.maxRedemptions,
      expiryDate,
      notes || null,
      userId
    ]);

    // Record plan assignment history
    await queryAsync(`
      INSERT INTO user_plan_history 
      (userId, planKey, startDate, assignedBy, reason, customRedemptionLimit, expiryDate) 
      VALUES (?, ?, NOW(), ?, ?, ?, ?)
    `, [
      userId, 
      planKey, 
      req.session.userId, 
      'Admin assignment with custom overrides',
      customRedemptionLimit || plan.maxRedemptions,
      expiryDate
    ]);

    res.json({ success: true, message: 'User plan assigned successfully with custom settings' });
  } catch (err) {
    console.error('Error assigning advanced user plan:', err);
    res.status(500).json({ success: false, message: 'Server error assigning plan' });
  }
});

// @route   PUT /api/admin/merchants/:id/plan-advanced
// @desc    Assign plan to merchant with custom overrides
// @access  Private (Admin only)
router.put('/merchants/:id/plan-advanced', auth, admin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.id);
    const { 
      planKey, 
      customDealLimit, 
      customExpiryDate, 
      customFeatures,
      notes 
    } = req.body;

    if (!planKey) {
      return res.status(400).json({ success: false, message: 'Plan key is required' });
    }

    // Verify plan exists and is a merchant plan
    const planResult = await queryAsync('SELECT * FROM plans WHERE `key` = ? AND type = "merchant" AND isActive = 1', [planKey]);
    if (!planResult.length) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive merchant plan' });
    }

    const plan = planResult[0];
    const expiryDate = customExpiryDate || (plan.billingCycle === 'monthly' ? 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : 
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

    // Update user (merchant) record
    await queryAsync(`
      UPDATE users SET 
        membershipType = ?, 
        planAssignedAt = NOW(), 
        planAssignedBy = ?,
        validationDate = ?,
        planStatus = 'active',
        planNotes = ?
      WHERE id = ? AND userType = 'merchant'
    `, [
      planKey, 
      req.session.userId, 
      expiryDate,
      notes || null,
      merchantId
    ]);

    // Update business record with custom settings
    await queryAsync(`
      UPDATE businesses SET 
        currentPlan = ?,
        planExpiryDate = ?,
        planStatus = 'active',
        customDealLimit = ?,
        dealsUsedThisMonth = 0,
        planAssignedAt = NOW(),
        planAssignedBy = ?
      WHERE userId = ?
    `, [
      planKey,
      expiryDate,
      customDealLimit || plan.dealPostingLimit,
      req.session.userId,
      merchantId
    ]);

    // Record plan assignment history
    await queryAsync(`
      INSERT INTO merchant_plan_history 
      (merchantId, planKey, startDate, assignedBy, reason, customDealLimit, expiryDate) 
      VALUES (?, ?, NOW(), ?, ?, ?, ?)
    `, [
      merchantId, 
      planKey, 
      req.session.userId, 
      'Admin assignment with custom overrides',
      customDealLimit || plan.dealPostingLimit,
      expiryDate
    ]);

    res.json({ success: true, message: 'Merchant plan assigned successfully with custom settings' });
  } catch (err) {
    console.error('Error assigning advanced merchant plan:', err);
    res.status(500).json({ success: false, message: 'Server error assigning plan' });
  }
});

// @route   POST /api/admin/users/:id/plan-override
// @desc    Set custom plan limits for a specific user
// @access  Private (Admin only)
router.post('/users/:id/plan-override', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { customRedemptionLimit, planExpiryDate, notes } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Update user with custom overrides
    const updateQuery = `
      UPDATE users SET 
        customRedemptionLimit = ?, 
        validationDate = ?, 
        adminNotes = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    await queryAsync(updateQuery, [
      customRedemptionLimit || null,
      planExpiryDate || null,
      notes || null,
      userId
    ]);    // Log the override action in activities table if it exists
    try {
      await queryAsync(
        'INSERT INTO activities (type, description, userId, relatedId, createdAt) VALUES (?, ?, ?, ?, NOW())',
        ['user_plan_override', `Custom plan override applied by admin`, req.session.userId, userId]
      );
    } catch (logError) {
      // Activities table might not exist, continue without logging
      console.log('Could not log activity:', logError.message);
    }

    res.json({ success: true, message: 'User plan overrides applied successfully' });
  } catch (err) {
    console.error('Error setting user plan override:', err);
    res.status(500).json({ success: false, message: 'Server error setting plan override' });
  }
});

// @route   POST /api/admin/merchants/:id/plan-override  
// @desc    Set custom plan limits for a specific merchant
// @access  Private (Admin only)
router.post('/merchants/:id/plan-override', auth, admin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.id);
    const { customDealLimit, planExpiryDate, notes } = req.body;
    
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID is required' });
    }

    // Update business with custom overrides
    const updateQuery = `
      UPDATE businesses SET 
        customDealLimit = ?, 
        planExpiryDate = ?, 
        adminNotes = ?,
        updated_at = NOW()
      WHERE userId = ?
    `;

    await queryAsync(updateQuery, [
      customDealLimit || null,
      planExpiryDate || null,
      notes || null,
      merchantId
    ]);    res.json({ success: true, message: 'Merchant plan overrides applied successfully' });
  } catch (err) {
    console.error('Error setting merchant plan override:', err);
    res.status(500).json({ success: false, message: 'Server error setting plan override' });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get admin analytics data
// @access  Private (Admin only)
router.get('/analytics', auth, admin, async (req, res) => {
  try {
    // For now, return mock analytics data to prevent frontend errors
    const analytics = {
      planUsage: [],
      upgradeConversions: [],
      upcomingExpiries: { users: 0, merchants: 0 }
    };
    
    res.json({ success: true, analytics });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ success: false, message: 'Server error fetching analytics' });
  }
});

// @route   GET /api/admin/plan-analytics
// @desc    Get plan-specific analytics data
// @access  Private (Admin only)
router.get('/plan-analytics', auth, admin, async (req, res) => {
  try {
    // For now, return mock plan analytics data to prevent frontend errors
    const analytics = {
      planUsage: [],
      upgradeConversions: [],
      upcomingExpiries: { users: 0, merchants: 0 }
    };
    
    res.json({ success: true, analytics });
  } catch (err) {
    console.error('Error fetching plan analytics:', err);
    res.status(500).json({ success: false, message: 'Server error fetching plan analytics' });
  }
});

// @route   GET /api/admin/settings
// @desc    Get admin settings
// @access  Private (Admin only)
router.get('/settings', auth, admin, async (req, res) => {
  try {
    // Fetch settings from database
    const settingsRows = await queryAsync('SELECT category, setting_key, setting_value, data_type FROM admin_settings');
      // Organize settings by category
    const settings = {
      systemSettings: {},
      socialMediaRequirements: {},
      featureToggles: {},
      content: {}
    };
    
    settingsRows.forEach(row => {
      const { category, setting_key, setting_value, data_type } = row;
      let value = setting_value;
      
      // Convert data types
      if (data_type === 'boolean') {
        value = setting_value === 'true';
      } else if (data_type === 'number') {
        value = parseInt(setting_value, 10);
      } else if (data_type === 'json') {
        try {
          value = JSON.parse(setting_value);
        } catch (e) {
          value = setting_value;
        }
      }
        // Map to appropriate category
      switch (category) {
        case 'system':
          if (setting_key === 'registration_enabled') settings.systemSettings.registrationEnabled = value;
          break;case 'social_media':
          if (setting_key.includes('_required')) {
            const platform = setting_key.replace('_required', '');
            if (!settings.socialMediaRequirements[platform]) settings.socialMediaRequirements[platform] = {};
            settings.socialMediaRequirements[platform].required = value;
          } else if (setting_key.includes('_url')) {
            const platform = setting_key.replace('_url', '');
            if (!settings.socialMediaRequirements[platform]) settings.socialMediaRequirements[platform] = {};
            settings.socialMediaRequirements[platform].url = value;
          } else if (setting_key.includes('_display_')) {
            const parts = setting_key.split('_display_');
            const platform = parts[0];
            const displayKey = parts[1];
            if (!settings.socialMediaRequirements[platform]) settings.socialMediaRequirements[platform] = {};
            if (!settings.socialMediaRequirements[platform].display) settings.socialMediaRequirements[platform].display = {};
            settings.socialMediaRequirements[platform].display[displayKey] = value;
          } else if (setting_key === 'home_section_title' || setting_key === 'home_section_subtitle') {
            settings.socialMediaRequirements[setting_key] = value;
          }
          break;        case 'features':
          if (setting_key === 'deal_management') settings.featureToggles.dealManagement = value;
          else if (setting_key === 'plan_management') settings.featureToggles.planManagement = value;
          else if (setting_key === 'user_management') settings.featureToggles.userManagement = value;
          else if (setting_key === 'business_directory') settings.featureToggles.businessDirectory = value;
          else if (setting_key === 'show_social_media_home') settings.featureToggles.showSocialMediaHome = value;
          break;
        case 'content':
          settings.content[setting_key] = value;
          break;
      }
    });
    
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Error fetching admin settings:', err);
    res.status(500).json({ success: false, message: 'Server error fetching settings' });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update admin settings
// @access  Private (Admin only)
router.put('/settings', auth, admin, async (req, res) => {
  try {
    const { settings } = req.body;
    
    // Flatten settings for database storage
    const updatePromises = [];
    
    // System settings
    if (settings.systemSettings) {
      const systemSettings = settings.systemSettings;
      if (systemSettings.siteName !== undefined) 
        updatePromises.push(updateSetting('system', 'site_name', systemSettings.siteName, 'string'));
      if (systemSettings.adminEmail !== undefined) 
        updatePromises.push(updateSetting('system', 'admin_email', systemSettings.adminEmail, 'string'));
      if (systemSettings.maintenanceMode !== undefined) 
        updatePromises.push(updateSetting('system', 'maintenance_mode', systemSettings.maintenanceMode.toString(), 'boolean'));
      if (systemSettings.registrationEnabled !== undefined) 
        updatePromises.push(updateSetting('system', 'registration_enabled', systemSettings.registrationEnabled.toString(), 'boolean'));
      if (systemSettings.loginImageUrl !== undefined) 
        updatePromises.push(updateSetting('system', 'login_image_url', systemSettings.loginImageUrl, 'string'));
      if (systemSettings.language !== undefined) 
        updatePromises.push(updateSetting('system', 'language', systemSettings.language, 'string'));
    }
      // Social media requirements
    if (settings.socialMediaRequirements) {
      const socialSettings = settings.socialMediaRequirements;
      
      // Handle home section title and subtitle
      if (socialSettings.home_section_title !== undefined) {
        updatePromises.push(updateSetting('social_media', 'home_section_title', socialSettings.home_section_title, 'string'));
      }
      if (socialSettings.home_section_subtitle !== undefined) {
        updatePromises.push(updateSetting('social_media', 'home_section_subtitle', socialSettings.home_section_subtitle, 'string'));
      }
      
      Object.keys(socialSettings).forEach(platform => {
        if (platform === 'home_section_title' || platform === 'home_section_subtitle') return;
        
        if (socialSettings[platform].required !== undefined) {
          updatePromises.push(updateSetting('social_media', `${platform}_required`, socialSettings[platform].required.toString(), 'boolean'));
        }
        if (socialSettings[platform].url !== undefined) {
          updatePromises.push(updateSetting('social_media', `${platform}_url`, socialSettings[platform].url, 'string'));
        }
        if (socialSettings[platform].display) {
          Object.keys(socialSettings[platform].display).forEach(displayKey => {
            updatePromises.push(updateSetting('social_media', `${platform}_display_${displayKey}`, socialSettings[platform].display[displayKey], 'string'));
          });
        }
      });
    }
      // Feature toggles
    if (settings.featureToggles) {
      const featureSettings = settings.featureToggles;
      if (featureSettings.dealManagement !== undefined) 
        updatePromises.push(updateSetting('features', 'deal_management', featureSettings.dealManagement.toString(), 'boolean'));
      if (featureSettings.planManagement !== undefined) 
        updatePromises.push(updateSetting('features', 'plan_management', featureSettings.planManagement.toString(), 'boolean'));
      if (featureSettings.userManagement !== undefined) 
        updatePromises.push(updateSetting('features', 'user_management', featureSettings.userManagement.toString(), 'boolean'));
      if (featureSettings.showStatistics !== undefined) 
        updatePromises.push(updateSetting('features', 'show_statistics', featureSettings.showStatistics.toString(), 'boolean'));
      if (featureSettings.businessDirectory !== undefined) 
        updatePromises.push(updateSetting('features', 'business_directory', featureSettings.businessDirectory.toString(), 'boolean'));
      if (featureSettings.showSocialMediaHome !== undefined) 
        updatePromises.push(updateSetting('features', 'show_social_media_home', featureSettings.showSocialMediaHome.toString(), 'boolean'));
    }
    
    // Security settings
    if (settings.securitySettings) {
      const securitySettings = settings.securitySettings;
      if (securitySettings.sessionTimeout !== undefined) 
        updatePromises.push(updateSetting('security', 'session_timeout', securitySettings.sessionTimeout.toString(), 'number'));
      if (securitySettings.maxLoginAttempts !== undefined) 
        updatePromises.push(updateSetting('security', 'max_login_attempts', securitySettings.maxLoginAttempts.toString(), 'number'));
      if (securitySettings.requireEmailVerification !== undefined) 
        updatePromises.push(updateSetting('security', 'require_email_verification', securitySettings.requireEmailVerification.toString(), 'boolean'));
      if (securitySettings.passwordMinLength !== undefined) 
        updatePromises.push(updateSetting('security', 'password_min_length', securitySettings.passwordMinLength.toString(), 'number'));
    }
    
    // Card settings
    if (settings.cardSettings) {
      const cardSettings = settings.cardSettings;
      Object.keys(cardSettings).forEach(key => {
        const dataType = typeof cardSettings[key] === 'boolean' ? 'boolean' : 'string';
        const value = dataType === 'boolean' ? cardSettings[key].toString() : cardSettings[key];
        updatePromises.push(updateSetting('card', key, value, dataType));
      });
    }
    
    // Content settings
    if (settings.content) {
      const contentSettings = settings.content;
      Object.keys(contentSettings).forEach(key => {
        updatePromises.push(updateSetting('content', key, contentSettings[key], 'string'));
      });
    }
    
    // Execute all updates
    await Promise.all(updatePromises);
    
    res.json({ success: true, message: 'Settings updated successfully', settings });
  } catch (err) {
    console.error('Error updating admin settings:', err);
    res.status(500).json({ success: false, message: 'Server error updating settings' });
  }
});

// Helper function to update a setting
async function updateSetting(category, key, value, dataType) {
  return queryAsync(
    'INSERT INTO admin_settings (category, setting_key, setting_value, data_type) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP',
    [category, key, value, dataType]
  );
}

// @route   GET /api/admin/businesses/:id
// @desc    Get business details by ID
// @access  Private (Admin only)
router.get('/businesses/:id', auth, admin, async (req, res) => {
  try {
    const businessId = req.params.id;
    if (!businessId) {
      return res.status(400).json({ success: false, message: 'Valid business ID is required.' });
    }
    const businessRows = await queryAsync(`
      SELECT b.*, 
             u.fullName as ownerName, 
             u.email as ownerEmail, 
             u.phone as ownerPhone, 
             u.address as ownerAddress, 
             u.profilePicture as logo, 
             u.status as ownerStatus, 
             u.created_at as ownerCreatedAt, 
             u.lastLogin, 
             u.city as ownerCity, 
             u.state as ownerState, 
             u.country as ownerCountry, 
             u.userCategory as category,
             u.membership as ownerMembershipLevel,
             u.membershipNumber as ownerMembershipNumber
      FROM businesses b
      LEFT JOIN users u ON b.userId = u.id
      WHERE b.businessId = ?
    `, [businessId]);

    if (!businessRows.length) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const b = businessRows[0];
    // Parse address if it's a JSON string
    let businessAddress = b.businessAddress;
    let city = b.city;
    let state = b.state;
    let country = b.country;
    if (businessAddress && typeof businessAddress === 'string') {
      try {
        const addressObj = JSON.parse(businessAddress);
        businessAddress = addressObj.street || addressObj.address || businessAddress;
        if (!city && addressObj.city) city = addressObj.city;
        if (!state && addressObj.state) state = addressObj.state;
        if (!country && addressObj.country) country = addressObj.country;
      } catch (e) {}
    }
    // Get total deals and active deals
    const dealsRows = await queryAsync(`
      SELECT COUNT(*) as totalDeals, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeDeals
      FROM deals
      WHERE businessId = ?
    `, [businessId]);
    const totalDeals = dealsRows[0]?.totalDeals || 0;
    const activeDeals = dealsRows[0]?.activeDeals || 0;
    // Get total redemptions for this business
    const redemptionRows = await queryAsync(`
      SELECT COUNT(*) as totalRedemptions
      FROM deal_redemptions
      WHERE deal_id IN (SELECT id FROM deals WHERE businessId = ?)
    `, [businessId]);
    const totalRedemptions = redemptionRows[0]?.totalRedemptions || 0;
    // Add rating (mock for now)
    const rating = 4.5;
    // Always return all expected fields with fallback values
    const business = {
      businessId: b.businessId || '',
      businessName: b.businessName || '',
      businessCategory: b.businessCategory || '',
      businessDescription: b.businessDescription || '',
      businessPhone: b.businessPhone || '',
      businessEmail: b.businessEmail || '',
      website: b.website || '',
      businessLicense: b.businessLicense || '',
      taxId: b.taxId || '',
      isVerified: !!b.isVerified,
      verificationDate: b.verificationDate || '',
      businessMembershipLevel: b.membershipLevel || '',
      businessStatus: b.status || '',
      businessCreatedAt: b.created_at || '',
      logo: b.logo || '',
      ownerName: b.ownerName || '',
      ownerEmail: b.ownerEmail || '',
      ownerPhone: b.ownerPhone || '',
      ownerAddress: b.ownerAddress || '',
      ownerCity: b.ownerCity || '',
      ownerState: b.ownerState || '',
      ownerCountry: b.ownerCountry || '',
      ownerStatus: b.ownerStatus || '',
      ownerCreatedAt: b.ownerCreatedAt || '',
      ownerMembershipLevel: b.ownerMembershipLevel || '',
      ownerMembershipNumber: b.ownerMembershipNumber || '',
      lastLogin: b.lastLogin || '',
      category: b.category || '',
      businessAddress: businessAddress || '',
      city: city || '',
      state: state || '',
      country: country || '',
      totalDeals,
      activeDeals,
      totalRedemptions,
      rating
    };
    res.json({ success: true, business });
  } catch (err) {
    console.error('Error fetching business:', err);
    res.status(500).json({ success: false, message: 'Server error fetching business' });
  }
});

// @route   PUT /api/admin/deals/:id
// @desc    Update a deal
// @access  Private (Admin only)
router.put('/deals/:id', auth, admin, async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);    const {
      title,
      description,
      businessId,
      category,
      discount,
      discountType,
      originalPrice,
      discountedPrice,
      termsConditions,
      validFrom,
      validUntil,
      couponCode,
      requiredPlanPriority,
      status
    } = req.body;

    // Validate required fields (match the POST route validation)
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }    // Check if deal exists
    const existingDeal = await queryAsync('SELECT id FROM deals WHERE id = ?', [dealId]);
    if (existingDeal.length === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    // Get plan information for accessLevel field (for display purposes)
    let planName = null;
    if (requiredPlanPriority) {
      const planResults = await queryAsync(
        'SELECT name FROM plans WHERE priority = ? AND type = "user" AND isActive = 1 LIMIT 1',
        [requiredPlanPriority]
      );
      if (planResults.length > 0) {
        planName = planResults[0].name;
      }
    }    // Update the deal (using same fields as POST route)
    const updateQuery = `
      UPDATE deals 
      SET title = ?, description = ?, businessId = ?, category = ?, 
          discount = ?, discountType = ?, originalPrice = ?, discountedPrice = ?, 
          termsConditions = ?, validFrom = ?, validUntil = ?, couponCode = ?,
          minPlanPriority = ?, accessLevel = ?, status = ?
      WHERE id = ?
    `;

    const result = await queryAsync(updateQuery, [
      title,
      description,
      businessId || null,
      category || 'general',
      discount || null,
      discountType || 'percentage',
      originalPrice ? parseFloat(originalPrice) : null,
      discountedPrice ? parseFloat(discountedPrice) : null,
      termsConditions || null,
      validFrom || null,
      validUntil || null,
      couponCode || null,      requiredPlanPriority || 1,
      planName || 'Community',
      status || 'active',
      dealId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    // Fetch and return the updated deal
    const updatedDeal = await queryAsync(`
      SELECT d.*, b.businessName as businessName, b.businessEmail as businessEmail, b.businessPhone as businessPhone
      FROM deals d
      LEFT JOIN businesses b ON d.businessId = b.businessId
      WHERE d.id = ?
    `, [dealId]);

    res.json({
      success: true,
      message: 'Deal updated successfully',
      deal: updatedDeal[0]
    });
  } catch (err) {
    console.error('Error updating deal:', err);
    res.status(500).json({ success: false, message: 'Server error updating deal' });
  }
});

// @route   POST /api/admin/plans/seed
// @desc    Seed default plans
// @access  Private (Admin only)
router.post('/plans/seed', auth, admin, async (req, res) => {
  try {
    const { force } = req.body;

    // Check if plans already exist
    const existingPlans = await queryAsync('SELECT COUNT(*) as count FROM plans');
    
    if (existingPlans[0].count > 0 && !force) {
      return res.status(400).json({
        success: false,
        message: 'Plans already exist. Use force: true to overwrite.'
      });
    }

    // If force is true, delete existing plans
    if (force) {
      await queryAsync('DELETE FROM plans');
    }

    // Default plans to seed
    const defaultPlans = [
      {
        name: 'Community Plan',
        key: 'community',
        description: 'Basic membership with community access',
        price: 0.00,
        currency: 'FREE',
        billingCycle: 'lifetime',
        features: JSON.stringify([
          'Basic directory access',
          'Community updates',
          'Basic support'
        ]),
        dealAccess: 'Limited community deals',
        maxDeals: 0,
        maxRedemptions: 5,
        userType: 'user',
        isActive: true
      },
      {
        name: 'Silver Plan',
        key: 'silver',
        description: 'Enhanced membership with additional perks',
        price: 50.00,
        currency: 'GHS',
        billingCycle: 'monthly',
        features: JSON.stringify([
          'All community features',
          'Priority support',
          'Exclusive deals',
          'Event notifications'
        ]),
        dealAccess: 'Silver + Community deals',
        maxDeals: 0,
        maxRedemptions: 15,
        userType: 'user',
        isActive: true
      },
      {
        name: 'Gold Plan',
        key: 'gold',
        description: 'Premium membership with full access',
        price: 150.00,
        currency: 'GHS',
        billingCycle: 'monthly',
        features: JSON.stringify([
          'All silver features',
          'VIP events',
          'Premium support',
          'Business networking',
          'Priority customer service'
        ]),
        dealAccess: 'All exclusive deals',
        maxDeals: 0,
        maxRedemptions: 50,
        userType: 'user',
        isActive: true
      },
      {
        name: 'Basic Business',
        key: 'basic_business',
        description: 'Basic business plan for merchants',
        price: 100.00,
        currency: 'GHS',
        billingCycle: 'monthly',
        features: JSON.stringify([
          'Business listing',
          'Create up to 5 deals',
          'Basic analytics',
          'Customer support'
        ]),
        dealAccess: 'Create business deals',
        maxDeals: 5,
        maxRedemptions: 100,
        userType: 'merchant',
        isActive: true
      },
      {
        name: 'Professional Business',
        key: 'professional_business',
        description: 'Professional business plan with enhanced features',
        price: 250.00,
        currency: 'GHS',
        billingCycle: 'monthly',
        features: JSON.stringify([
          'All basic features',
          'Create up to 20 deals',
          'Advanced analytics',
          'Priority listing',
          'Marketing tools'
        ]),
        dealAccess: 'Enhanced business deals',
        maxDeals: 20,
        maxRedemptions: 500,
        userType: 'merchant',
        isActive: true
      },
      {
        name: 'Enterprise Business',
        key: 'enterprise_business',
        description: 'Enterprise business plan with unlimited features',
        price: 500.00,
        currency: 'GHS',
        billingCycle: 'monthly',
        features: JSON.stringify([
          'All professional features',
          'Unlimited deals',
          'Premium analytics',
          'Featured listing',
          'Custom marketing',
          'Dedicated support'
        ]),
        dealAccess: 'Premium business deals',
        maxDeals: -1, // Unlimited
        maxRedemptions: -1, // Unlimited
        userType: 'merchant',
        isActive: true
      }
    ];

    // Insert plans
    const insertQuery = `
      INSERT INTO plans (name, \`key\`, description, price, currency, billingCycle, 
                        features, dealAccess, maxDeals, maxRedemptions, userType, isActive, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const plan of defaultPlans) {
      await queryAsync(insertQuery, [
        plan.name,
        plan.key,
        plan.description,
        plan.price,
        plan.currency,
        plan.billingCycle,
        plan.features,
        plan.dealAccess,
        plan.maxDeals,
        plan.maxRedemptions,
        plan.userType,
        plan.isActive
      ]);
    }

    res.json({
      success: true,
      message: `Successfully seeded ${defaultPlans.length} default plans.`
    });
  } catch (err) {
    console.error('Error seeding plans:', err);
    res.status(500).json({ success: false, message: 'Server error seeding plans' });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user
// @access  Private (Admin only)
router.post('/users', auth, admin, async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      address,
      dob,
      community,
      country = 'Ghana',
      state,
      city,
      userType = 'user',
      membershipType = 'basic',
      status = 'approved'
    } = req.body;

    // Validate required fields
    if (!fullName || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Full name and email are required' 
      });
    }

    // Check if email already exists
    const existingUser = await queryAsync('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Generate a temporary password (user should reset it)
    const bcrypt = require('bcryptjs');
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Generate membership number
    const membershipNumber = `MEM${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;

    // Insert new user
    const insertQuery = `
      INSERT INTO users (
        fullName, email, password, phone, address, dob, community, 
        country, state, city, userType, membershipType, status, 
        membershipNumber, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await queryAsync(insertQuery, [
      fullName, email, hashedPassword, phone || null, address || null,
      dob || null, community || null, country, state || null, city || null,
      userType, membershipType, status, membershipNumber
    ]);

    // Get the created user
    const newUser = await queryAsync(`
      SELECT u.id, u.fullName, u.email, u.phone, u.address, u.community, 
             u.membershipType, u.userType, u.status, u.membershipNumber, 
             u.created_at, p.name as planName
      FROM users u
      LEFT JOIN plans p ON u.membershipType = p.key
      WHERE u.id = ?
    `, [result.insertId]);

    // Log activity: admin added a user
    try {
      await queryAsync(
        `INSERT INTO activities (type, title, description, userId, userName, userEmail, userType, timestamp, icon)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          'user_registered',
          'User Added by Admin',
          `${fullName} was added by admin (${req.user?.fullName || 'Admin'})`,
          newUser[0].id,
          fullName,
          email,
          userType,
          'fa-user-plus'
        ]
      );
    } catch (activityErr) {
      console.error('Failed to log user creation activity:', activityErr);
    }
    // Return user data without password and include temp password for admin
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser[0],
      tempPassword: tempPassword // Admin should share this securely with the user
    });

  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, message: 'Server error creating user' });
  }
});

// @route   GET /api/admin/settings/public
// @desc    Get public admin settings (no auth required)
// @access  Public
router.get('/settings/public', async (req, res) => {
  try {
    // Fetch only public settings from database
    const settingsRows = await queryAsync(
      'SELECT category, setting_key, setting_value, data_type FROM admin_settings WHERE category IN (?, ?, ?, ?)', 
      ['social_media', 'content', 'features', 'card']
    );
    
    // Organize settings by category
    const settings = {
      socialMediaRequirements: {},
      content: {},
      features: {},
      cardSettings: {}
    };
    
    settingsRows.forEach(row => {
      const { category, setting_key, setting_value, data_type } = row;
      let value = setting_value;
      
      // Convert data types
      if (data_type === 'boolean') {
        value = setting_value === 'true';
      } else if (data_type === 'number') {
        value = parseInt(setting_value, 10);
      } else if (data_type === 'json') {
        try {
          value = JSON.parse(setting_value);
        } catch (e) {
          value = setting_value;
        }
      }
        // Map to appropriate category
      if (category === 'social_media') {
        if (setting_key.includes('_required')) {
          const platform = setting_key.replace('_required', '');
          if (!settings.socialMediaRequirements[platform]) settings.socialMediaRequirements[platform] = {};
          settings.socialMediaRequirements[platform].required = value;
        } else if (setting_key.includes('_url')) {
          const platform = setting_key.replace('_url', '');
          if (!settings.socialMediaRequirements[platform]) settings.socialMediaRequirements[platform] = {};
          settings.socialMediaRequirements[platform].url = value;
        } else if (setting_key.includes('_display_')) {
          const parts = setting_key.split('_display_');
          const platform = parts[0];
          const displayKey = parts[1];
          if (!settings.socialMediaRequirements[platform]) settings.socialMediaRequirements[platform] = {};
          if (!settings.socialMediaRequirements[platform].display) settings.socialMediaRequirements[platform].display = {};
          settings.socialMediaRequirements[platform].display[displayKey] = value;
        } else if (setting_key === 'home_section_title' || setting_key === 'home_section_subtitle') {
          settings.socialMediaRequirements[setting_key] = value;
        }
      } else if (category === 'content') {
        settings.content[setting_key] = value;
      } else if (category === 'features') {
        settings.features[setting_key] = value;
      } else if (category === 'card') {
        settings.cardSettings[setting_key] = value;
      }
    });
    
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Error fetching public settings:', err);    res.status(500).json({ success: false, message: 'Server error fetching public settings' });
  }
});

// @route   POST /api/admin/users/:id/approve
// @desc    Approve a user
// @access  Private (Admin only)
router.post('/users/:id/approve', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const result = await queryAsync(
      'UPDATE users SET status = "approved", statusUpdatedAt = NOW(), statusUpdatedBy = ? WHERE id = ?',
      [req.session.userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log activity
    await queryAsync(
      'INSERT INTO activities (type, description, userId, relatedId, createdAt) VALUES (?, ?, ?, ?, NOW())',
      ['user_approved', 'User approved by admin', req.session.userId, userId]
    );

    res.json({ success: true, message: 'User approved successfully' });
  } catch (err) {
    console.error('Error approving user:', err);
    res.status(500).json({ success: false, message: 'Server error approving user' });
  }
});

// @route   POST /api/admin/users/:id/reject
// @desc    Reject a user
// @access  Private (Admin only)
router.post('/users/:id/reject', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { comment } = req.body;
    
    const result = await queryAsync(
      'UPDATE users SET status = "rejected", statusUpdatedAt = NOW(), statusUpdatedBy = ? WHERE id = ?',
      [req.session.userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log activity
    await queryAsync(
      'INSERT INTO activities (type, description, userId, relatedId, createdAt) VALUES (?, ?, ?, ?, NOW())',
      ['user_rejected', `User rejected by admin${comment ? ': ' + comment : ''}`, req.session.userId, userId]
    );

    res.json({ success: true, message: 'User rejected successfully' });
  } catch (err) {
    console.error('Error rejecting user:', err);
    res.status(500).json({ success: false, message: 'Server error rejecting user' });
  }
});

// @route   POST /api/admin/users/:id/suspend
// @desc    Suspend a user
// @access  Private (Admin only)
router.post('/users/:id/suspend', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { comment } = req.body;
    
    const result = await queryAsync(
      'UPDATE users SET status = "suspended", statusUpdatedAt = NOW(), statusUpdatedBy = ? WHERE id = ?',
      [req.session.userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log activity
    await queryAsync(
      'INSERT INTO activities (type, description, userId, relatedId, createdAt) VALUES (?, ?, ?, ?, NOW())',
      ['user_suspended', `User suspended by admin${comment ? ': ' + comment : ''}`, req.session.userId, userId]
    );

    res.json({ success: true, message: 'User suspended successfully' });
  } catch (err) {
    console.error('Error suspending user:', err);
    res.status(500).json({ success: false, message: 'Server error suspending user' });
  }
});

// @route   POST /api/admin/users/:id/activate
// @desc    Activate a user
// @access  Private (Admin only)
router.post('/users/:id/activate', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const result = await queryAsync(
      'UPDATE users SET status = "approved", statusUpdatedAt = NOW(), statusUpdatedBy = ? WHERE id = ?',
      [req.session.userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log activity
    await queryAsync(
      'INSERT INTO activities (type, description, userId, relatedId, createdAt) VALUES (?, ?, ?, ?, NOW())',
      ['user_activated', 'User activated by admin', req.session.userId, userId]
    );

    res.json({ success: true, message: 'User activated successfully' });
  } catch (err) {
    console.error('Error activating user:', err);
    res.status(500).json({ success: false, message: 'Server error activating user' });
  }
});

// @route   POST /api/admin/users/bulk-action
// @desc    Perform bulk actions on users
// @access  Private (Admin only)
router.post('/users/bulk-action', auth, admin, async (req, res) => {
  try {
    const { action, userIds } = req.body;
    
    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action and user IDs are required' 
      });
    }

    // Validate action
    const validActions = ['approve', 'reject', 'suspend', 'activate', 'delete'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid action specified' 
      });
    }

    // Convert string IDs to integers
    const numericIds = userIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (numericIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No valid user IDs provided' 
      });
    }

    const placeholders = numericIds.map(() => '?').join(',');
    let updateQuery;
    let logAction;

    switch (action) {
      case 'approve':
      case 'activate':
        updateQuery = `UPDATE users SET status = "approved", statusUpdatedAt = NOW(), statusUpdatedBy = ? WHERE id IN (${placeholders})`;
        logAction = 'users_bulk_approved';
        break;
      case 'reject':
        updateQuery = `UPDATE users SET status = "rejected", statusUpdatedAt = NOW(), statusUpdatedBy = ? WHERE id IN (${placeholders})`;
        logAction = 'users_bulk_rejected';
        break;
      case 'suspend':
        updateQuery = `UPDATE users SET status = "suspended", statusUpdatedAt = NOW(), statusUpdatedBy = ? WHERE id IN (${placeholders})`;
        logAction = 'users_bulk_suspended';
        break;
      case 'delete':
        // Prevent deletion of admin users
        const adminCheck = await queryAsync(`SELECT COUNT(*) as count FROM users WHERE id IN (${placeholders}) AND userType = "admin"`, numericIds);
        if (adminCheck[0].count > 0) {
          return res.status(403).json({ 
            success: false, 
            message: 'Cannot delete admin users' 
          });
        }
        updateQuery = `DELETE FROM users WHERE id IN (${placeholders})`;
        logAction = 'users_bulk_deleted';
        break;
    }

    // Execute the bulk action
    const result = await queryAsync(updateQuery, [req.session.userId, ...numericIds]);

    // Log the bulk activity
    await queryAsync(
      'INSERT INTO activities (type, description, userId, createdAt) VALUES (?, ?, ?, NOW())',
      [logAction, `Bulk ${action} performed on ${result.affectedRows} users by admin`, req.session.userId]
    );

    res.json({ 
      success: true, 
      message: `Successfully ${action}ed ${result.affectedRows} user(s)`,
      affectedRows: result.affectedRows
    });

  } catch (err) {
    console.error('Error performing bulk action:', err);
    res.status(500).json({ success: false, message: 'Server error performing bulk action' });
  }
});

// @route   POST /api/admin/plans
// @desc    Create a new membership plan
// @access  Private (Admin only)
router.post('/plans', [
  auth,
  admin,
  body('key').notEmpty().trim().escape(),
  body('name').notEmpty().trim().escape(),
  body('price').isDecimal(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { key, name, description, price, currency, billingCycle, features, dealAccess, type, isActive, priority } = req.body;

    // Check if plan key already exists
    const existingPlan = await queryAsync('SELECT id FROM plans WHERE `key` = ?', [key]);
    if (existingPlan.length > 0) {
      return res.status(400).json({ success: false, message: 'Plan key already exists.' });
    }

    const result = await queryAsync(`
      INSERT INTO plans (\`key\`, name, description, price, currency, billingCycle, features, dealAccess, type, isActive, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [key, name, description || '', price || 0, currency || 'GHS', billingCycle || 'yearly', 
        JSON.stringify(features || []), dealAccess || null, type || 'user', isActive !== false, priority || 0]);

    // Get the created plan
    const planRows = await queryAsync('SELECT * FROM plans WHERE id = ?', [result.insertId]);

    return res.json({ success: true, plan: planRows[0] });
  } catch (err) {
    console.error('Error creating plan:', err);
    return res.status(500).json({ success: false, message: 'Server error creating plan.' });
  }
});

// ===== ENHANCED COMMUNITIES MANAGEMENT =====

// @route   POST /api/admin/communities
// @desc    Create a new community
// @access  Private (Admin only)
router.post('/communities', auth, admin, async (req, res) => {
  try {
    const { name, description, displayOrder, isActive } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Community name is required' });
    }
    
    const result = await queryAsync(
      'INSERT INTO communities (name, description, displayOrder, isActive) VALUES (?, ?, ?, ?)',
      [name, description || '', displayOrder || 999, isActive !== false]
    );
    
    const community = await queryAsync('SELECT * FROM communities WHERE id = ?', [result.insertId]);
    res.json({ success: true, community: community[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'Community name already exists' });
    } else {
      console.error('Error creating community:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// @route   PUT /api/admin/communities/:id
// @desc    Update a community
// @access  Private (Admin only)
router.put('/communities/:id', auth, admin, async (req, res) => {
  try {
    const { name, description, displayOrder, isActive } = req.body;
    const communityId = parseInt(req.params.id);
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Community name is required' });
    }
    
    const result = await queryAsync(
      'UPDATE communities SET name = ?, description = ?, displayOrder = ?, isActive = ? WHERE id = ?',
      [name, description || '', displayOrder || 999, isActive !== false, communityId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }
    
    const community = await queryAsync('SELECT * FROM communities WHERE id = ?', [communityId]);
    res.json({ success: true, community: community[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'Community name already exists' });
    } else {
      console.error('Error updating community:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// @route   DELETE /api/admin/communities/:id
// @desc    Delete a community
// @access  Private (Admin only)
router.delete('/communities/:id', auth, admin, async (req, res) => {
  try {
    const communityId = parseInt(req.params.id);
    
    const result = await queryAsync('DELETE FROM communities WHERE id = ?', [communityId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }
    
    res.json({ success: true, message: 'Community deleted successfully' });
  } catch (err) {
    console.error('Error deleting community:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===== USER TYPES MANAGEMENT =====

// @route   GET /api/admin/user-types
// @desc    Get all user types for admin management
// @access  Private (Admin only)
router.get('/user-types', auth, admin, async (req, res) => {
  try {
    const userTypes = await queryAsync('SELECT * FROM user_types ORDER BY displayOrder, name');
    res.json({ success: true, userTypes });
  } catch (err) {
    console.error('Error fetching user types:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/user-types
// @desc    Create a new user type
// @access  Private (Admin only)
router.post('/user-types', auth, admin, async (req, res) => {
  try {
    const { name, description, displayOrder, isActive } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'User type name is required' });
    }
    
    const result = await queryAsync(
      'INSERT INTO user_types (name, description, displayOrder, isActive) VALUES (?, ?, ?, ?)',
      [name, description || '', displayOrder || 999, isActive !== false]
    );
    
    const userType = await queryAsync('SELECT * FROM user_types WHERE id = ?', [result.insertId]);
    res.json({ success: true, userType: userType[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'User type name already exists' });
    } else {
      console.error('Error creating user type:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// @route   PUT /api/admin/user-types/:id
// @desc    Update a user type
// @access  Private (Admin only)
router.put('/user-types/:id', auth, admin, async (req, res) => {
  try {
    const { name, description, displayOrder, isActive } = req.body;
    const userTypeId = parseInt(req.params.id);
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'User type name is required' });
    }
    
    const result = await queryAsync(
      'UPDATE user_types SET name = ?, description = ?, displayOrder = ?, isActive = ? WHERE id = ?',
      [name, description || '', displayOrder || 999, isActive !== false, userTypeId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User type not found' });
    }
    
    const userType = await queryAsync('SELECT * FROM user_types WHERE id = ?', [userTypeId]);
    res.json({ success: true, userType: userType[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'User type name already exists' });
    } else {
      console.error('Error updating user type:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// @route   DELETE /api/admin/user-types/:id
// @desc    Delete a user type
// @access  Private (Admin only)
router.delete('/user-types/:id', auth, admin, async (req, res) => {
  try {
    const userTypeId = parseInt(req.params.id);
    
    const result = await queryAsync('DELETE FROM user_types WHERE id = ?', [userTypeId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User type not found' });
    }
    
    res.json({ success: true, message: 'User type deleted successfully' });
  } catch (err) {
    console.error('Error deleting user type:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
