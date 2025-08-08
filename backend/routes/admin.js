// Admin routes - Complete Enhanced MySQL implementation with all fixes
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
      if (err) {
        console.error('Database query error:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// Get admin user ID from session/token - FIXED
const getAdminUserId = (req) => {
  return req.user?.id || req.session?.userId || req.body?.adminId || 1;
};

// Check if table exists helper function
const tableExists = async (tableName) => {
  try {
    await queryAsync(`SELECT 1 FROM ${tableName} LIMIT 1`);
    return true;
  } catch (error) {
    return false;
  }
};

// Check if column exists in table
const columnExists = async (tableName, columnName) => {
  try {
    const result = await queryAsync(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = DATABASE()
    `, [tableName, columnName]);
    return result.length > 0;
  } catch (error) {
    return false;
  }
};

// ===== DASHBOARD & STATS =====
router.get('/dashboard', auth, admin, async (req, res) => {
  try {
    let planRows = [];
    try {
      planRows = await queryAsync('SELECT `key`, name FROM plans WHERE isActive = TRUE ORDER BY priority');
    } catch (planError) {
      console.warn('Plans table not found, using fallback');
      planRows = [
        { key: 'community', name: 'Community' },
        { key: 'silver', name: 'Silver' },
        { key: 'gold', name: 'Gold' }
      ];
    }

    const planKeys = planRows.map(plan => plan.key);

    // Count users by plan type - FIXED: using correct column names
    const userPlanCounts = {};
    const merchantPlanCounts = {};
    
    for (const plan of planRows) {
      try {
        // Using membershipType (varchar) instead of membership (enum)
        const userCount = await queryAsync(
          'SELECT COUNT(*) AS count FROM users WHERE membershipType = ? AND userType != "merchant"',
          [plan.key]
        );
        userPlanCounts[plan.key] = userCount[0]?.count || 0;

        const merchantCount = await queryAsync(
          'SELECT COUNT(*) AS count FROM users WHERE membershipType = ? AND userType = "merchant"',
          [plan.key]
        );
        merchantPlanCounts[plan.key] = merchantCount[0]?.count || 0;
      } catch (countError) {
        console.warn(`Error counting users for plan ${plan.key}:`, countError);
        userPlanCounts[plan.key] = 0;
        merchantPlanCounts[plan.key] = 0;
      }
    }

    // Get basic stats
    const totalUsers = await queryAsync('SELECT COUNT(*) AS count FROM users WHERE userType != "merchant"');
    const totalMerchants = await queryAsync('SELECT COUNT(*) AS count FROM users WHERE userType = "merchant"');
    const pendingApprovals = await queryAsync('SELECT COUNT(*) AS count FROM users WHERE status = "pending"');
    const activeBusinesses = await queryAsync('SELECT COUNT(*) AS count FROM users WHERE userType = "merchant" AND status = "approved"');
    
    let totalDeals = [{ count: 0 }];
    try {
      totalDeals = await queryAsync('SELECT COUNT(*) AS count FROM deals WHERE status = "active"');
    } catch (dealsError) {
      console.warn('Deals table not found, setting totalDeals to 0');
    }

    const stats = {
      totalUsers: totalUsers[0]?.count || 0,
      totalMerchants: totalMerchants[0]?.count || 0,
      pendingApprovals: pendingApprovals[0]?.count || 0,
      activeBusinesses: activeBusinesses[0]?.count || 0,
      activePlans: planKeys.length,
      totalDeals: totalDeals[0]?.count || 0,
      totalRevenue: 0,
      userPlanCounts,
      merchantPlanCounts,
      planKeys: planRows
    };

    return res.json({ success: true, stats });
  } catch (err) {
    console.error('Error fetching admin dashboard stats:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching dashboard stats.' });
  }
});

router.get('/stats', auth, admin, async (req, res) => {
  try {
    const [userCount] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE userType != "merchant"');
    const [merchantCount] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE userType = "merchant"');
    const [pendingUserApprovals] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE status = "pending" AND userType != "merchant"');
    const [pendingMerchantApprovals] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE status = "pending" AND userType = "merchant"');
    const [activeBusinesses] = await queryAsync('SELECT COUNT(*) as count FROM users WHERE status = "approved" AND userType = "merchant"');
    
    let totalDeals = [{ count: 0 }];
    try {
      totalDeals = await queryAsync('SELECT COUNT(*) as count FROM deals WHERE status = "active"');
    } catch (dealsError) {
      console.warn('Deals table not found');
    }

    const stats = {
      totalUsers: userCount?.count || 0,
      totalMerchants: merchantCount?.count || 0,
      pendingApprovals: (pendingUserApprovals?.count || 0) + (pendingMerchantApprovals?.count || 0),
      activeBusinesses: activeBusinesses?.count || 0,
      totalDeals: totalDeals[0]?.count || 0,
      totalRevenue: 0
    };

    res.json({ success: true, stats });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ success: false, message: 'Server error fetching statistics' });
  }
});

router.get('/activities', auth, admin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const dateRange = parseInt(req.query.dateRange) || 30;

    try {
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
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ORDER BY timestamp DESC
        LIMIT ?
      `, [dateRange, limit]);

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

      return res.json({ success: true, activities: formatted });
    } catch (activitiesError) {
      const activities = [];

      // FIXED: Use correct date column - createdAt instead of created_at for main query
      const recentUsers = await queryAsync(`
        SELECT id, fullName, email, userType, createdAt, status
        FROM users
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND userType != 'admin'
        ORDER BY createdAt DESC
        LIMIT ?
      `, [dateRange, Math.min(limit, 20)]);

      recentUsers.forEach(user => {
        activities.push({
          id: `user_${user.id}`,
          type: user.userType === 'merchant' ? 'business_registered' : 'user_registered',
          title: user.userType === 'merchant' ? 'New Business Registration' : 'New User Registration',
          description: `${user.fullName} registered as a ${user.userType}`,
          user: {
            name: user.fullName,
            email: user.email,
            type: user.userType
          },
          timestamp: user.createdAt,
          icon: user.userType === 'merchant' ? 'store' : 'user-plus'
        });
      });

      const recentPlanAssignments = await queryAsync(`
        SELECT id, fullName, email, membershipType, planAssignedAt, userType
        FROM users
        WHERE planAssignedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ORDER BY planAssignedAt DESC
        LIMIT ?
      `, [dateRange, Math.min(limit, 10)]);

      recentPlanAssignments.forEach(user => {
        activities.push({
          id: `plan_${user.id}`,
          type: 'plan_assigned',
          title: 'Plan Assignment',
          description: `${user.fullName} was assigned ${user.membershipType} plan`,
          user: {
            name: user.fullName,
            email: user.email,
            type: user.userType
          },
          timestamp: user.planAssignedAt,
          icon: 'crown'
        });
      });

      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const limitedActivities = activities.slice(0, limit);

      return res.json({ success: true, activities: limitedActivities });
    }
  } catch (err) {
    console.error('Error fetching activities:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching activities.' });
  }
});

// ===== USER MANAGEMENT =====
router.get('/users', auth, admin, async (req, res) => {
  try {
    const {
      status,
      userType,
      membershipType,
      community,
      search,
      dateFrom,
      dateTo,
      planExpired,
      page = 1,
      limit = 20
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    // Apply filters
    if (status && status !== 'all') {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    if (userType && userType !== 'all') {
      whereClause += ' AND u.userType = ?';
      params.push(userType);
    }

    if (membershipType && membershipType !== 'all') {
      if (membershipType === 'none') {
        whereClause += ' AND (u.membershipType IS NULL OR u.membershipType = "")';
      } else {
        whereClause += ' AND u.membershipType = ?';
        params.push(membershipType);
      }
    }

    if (community && community !== 'all') {
      whereClause += ' AND u.community = ?';
      params.push(community);
    }

    if (search && search.trim()) {
      whereClause += ' AND (u.fullName LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.membershipNumber LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (dateFrom) {
      whereClause += ' AND DATE(u.createdAt) >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND DATE(u.createdAt) <= ?';
      params.push(dateTo);
    }

    if (planExpired && planExpired !== 'all') {
      if (planExpired === 'yes') {
        whereClause += ' AND u.validationDate < NOW()';
      } else if (planExpired === 'no') {
        whereClause += ' AND (u.validationDate IS NULL OR u.validationDate >= NOW())';
      }
    }

    // Pagination
    const currentPage = parseInt(page) || 1;
    const pageSize = Math.min(parseInt(limit) || 20, 100);
    const offset = (currentPage - 1) * pageSize;

    const countResult = await queryAsync(`
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `, params);
    
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    // FIXED: Updated query with correct column names from your schema
    let mainQuery = `
      SELECT 
        u.id, u.fullName, u.email, u.phone, u.address, u.community, u.membershipType,
        u.userType, u.userCategory, u.status, u.createdAt, u.lastLogin, u.dob,
        u.country, u.state, u.city, u.planAssignedAt, u.planAssignedBy, u.currentPlan,
        u.membershipNumber, u.validationDate, u.updated_at, u.profilePicture`;

    const plansTableExists = await tableExists('plans');
    const communitiesTableExists = await tableExists('communities');

    if (plansTableExists) {
      mainQuery += `, p.name as planName, p.price as planPrice, p.billingCycle, p.currency, p.features`;
    }

    if (communitiesTableExists) {
      mainQuery += `, c.name as communityName`;
    }

    mainQuery += ` FROM users u`;

    if (plansTableExists) {
      mainQuery += ` LEFT JOIN plans p ON u.membershipType = p.key`;
    }

    if (communitiesTableExists) {
      mainQuery += ` LEFT JOIN communities c ON u.community = c.name`;
    }

    mainQuery += ` ${whereClause} ORDER BY u.createdAt DESC LIMIT ? OFFSET ?`;

    const users = await queryAsync(mainQuery, [...params, pageSize, offset]);

    const processedUsers = users.map(user => {
      let processedUser = { ...user };

      if (user.address && typeof user.address === 'string') {
        try {
          const addressObj = JSON.parse(user.address);
          processedUser.address = addressObj.street || addressObj.address || user.address;
          if (!processedUser.city && addressObj.city) processedUser.city = addressObj.city;
          if (!processedUser.state && addressObj.state) processedUser.state = addressObj.state;
          if (!processedUser.country && addressObj.country) processedUser.country = addressObj.country;
        } catch (e) {
          processedUser.address = user.address;
        }
      }

      processedUser.planExpiryDate = user.validationDate;
      if (user.validationDate) {
        processedUser.isPlanExpired = new Date(user.validationDate) < new Date();
      }

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

router.get('/users/:id', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required.' });
    }

    // FIXED: Updated query with correct column names
    let query = `
      SELECT 
        u.id, u.fullName, u.email, u.phone, u.address, u.community, u.membershipType,
        u.userType, u.userCategory, u.status, u.createdAt, u.lastLogin, u.dob,
        u.country, u.state, u.city, u.planAssignedAt, u.planAssignedBy, u.currentPlan,
        u.membershipNumber, u.validationDate, u.updated_at, u.profilePicture`;

    const plansTableExists = await tableExists('plans');
    const communitiesTableExists = await tableExists('communities');

    if (plansTableExists) {
      query += `, p.name as planName, p.price as planPrice, p.billingCycle, p.currency, p.features`;
    }

    if (communitiesTableExists) {
      query += `, c.name as communityName`;
    }

    query += ` FROM users u`;

    if (plansTableExists) {
      query += ` LEFT JOIN plans p ON u.membershipType = p.key`;
    }

    if (communitiesTableExists) {
      query += ` LEFT JOIN communities c ON u.community = c.name`;
    }

    query += ` WHERE u.id = ?`;

    const userRows = await queryAsync(query, [userId]);

    if (!userRows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userRows[0];

    if (user.address && typeof user.address === 'string') {
      try {
        const addressObj = JSON.parse(user.address);
        user.address = addressObj.street || addressObj.address || user.address;
        if (!user.city && addressObj.city) user.city = addressObj.city;
        if (!user.state && addressObj.state) user.state = addressObj.state;
        if (!user.country && addressObj.country) user.country = addressObj.country;
      } catch (e) {
        // Keep original address if parsing fails
      }
    }

    user.planExpiryDate = user.validationDate;
    if (user.validationDate) {
      user.isPlanExpired = new Date(user.validationDate) < new Date();
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ success: false, message: 'Server error fetching user.' });
  }
});

router.post('/users', [
  auth,
  admin,
  body('fullName').notEmpty().trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      fullName,
      email,
      phone,
      userType,
      membershipType,
      community,
      address,
      city,
      state,
      country,
      dob,
      status
    } = req.body;

    const existingUser = await queryAsync('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const membershipNumber = `IGM${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;

    let addressData = address;
    if (typeof address === 'object') {
      addressData = JSON.stringify(address);
    }

    const adminUserId = getAdminUserId(req);

    const result = await queryAsync(`
      INSERT INTO users (
        fullName, email, password, phone, userType, membershipType, community,
        address, city, state, country, dob, status, membershipNumber,
        createdAt, planAssignedAt, planAssignedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)
    `, [
      fullName,
      email,
      hashedPassword,
      phone || null,
      userType || 'user',
      membershipType || 'community',
      community || null,
      addressData || null,
      city || null,
      state || null,
      country || 'Ghana',
      dob || null,
      status || 'approved',
      membershipNumber,
      adminUserId
    ]);

    const newUser = await queryAsync(`
      SELECT id, fullName, email, userType, membershipType, status, createdAt, membershipNumber
      FROM users WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser[0],
      tempPassword: tempPassword
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, message: 'Server error creating user.' });
  }
});

router.put('/users/:id', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updateData = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required' });
    }

    const allowedFields = [
      'fullName', 'email', 'phone', 'address', 'dob', 'community',
      'country', 'state', 'city', 'membershipType', 'status',
      'userCategory', 'currentPlan'
    ];

    const updates = [];
    const values = [];

    Object.keys(updateData).forEach(field => {
      if (allowedFields.includes(field) && updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        
        if (field === 'address' && typeof updateData[field] === 'object') {
          values.push(JSON.stringify(updateData[field]));
        } else {
          values.push(updateData[field]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    // FIXED: Use correct timestamp column
    updates.push('updated_at = NOW()');
    values.push(userId);

    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    const result = await queryAsync(updateQuery, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let query = 'SELECT u.*';
    
    if (await tableExists('communities')) {
      query += ', c.name as communityName';
    }
    
    if (await tableExists('plans')) {
      query += ', p.name as planName';
    }
    
    query += ' FROM users u';
    
    if (await tableExists('communities')) {
      query += ' LEFT JOIN communities c ON u.community = c.name';
    }
    
    if (await tableExists('plans')) {
      query += ' LEFT JOIN plans p ON u.membershipType = p.key';
    }
    
    query += ' WHERE u.id = ?';

    const updatedUser = await queryAsync(query, [userId]);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser[0]
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Server error updating user' });
  }
});

router.delete('/users/:id', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required' });
    }

    const userCheck = await queryAsync('SELECT id, userType FROM users WHERE id = ?', [userId]);
    if (!userCheck.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (userCheck[0].userType === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete admin users' });
    }

    if (userCheck[0].userType === 'merchant' && await tableExists('businesses')) {
      try {
        await queryAsync('DELETE FROM businesses WHERE userId = ?', [userId]);
      } catch (businessError) {
        console.warn('Error deleting business data:', businessError);
      }
    }

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

router.put('/users/:id/status', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required' });
    }

    if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const adminUserId = getAdminUserId(req);

    const hasStatusUpdatedAt = await columnExists('users', 'statusUpdatedAt');
    const hasStatusUpdatedBy = await columnExists('users', 'statusUpdatedBy');

    let updateQuery = 'UPDATE users SET status = ?, updated_at = NOW()';
    let params = [status];

    if (hasStatusUpdatedAt) {
      updateQuery += ', statusUpdatedAt = NOW()';
    }

    if (hasStatusUpdatedBy) {
      updateQuery += ', statusUpdatedBy = ?';
      params.push(adminUserId);
    }

    updateQuery += ' WHERE id = ?';
    params.push(userId);

    const result = await queryAsync(updateQuery, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (await tableExists('activities')) {
      try {
        await queryAsync(
          'INSERT INTO activities (type, description, userId, timestamp) VALUES (?, ?, ?, NOW())',
          [`user_${status}`, `User ${status} by admin`, adminUserId]
        );
      } catch (activityError) {
        console.warn('Error logging activity:', activityError);
      }
    }

    res.json({ success: true, message: `User ${status} successfully` });
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({ success: false, message: 'Server error updating user status' });
  }
});

// FIXED: Complete Plan Assignment with User Type Filtering
router.post('/users/:id/assign-plan', auth, admin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { planKey, planId } = req.body;

    console.log('🎯 Plan assignment request:', { userId, planKey, planId });

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required.' });
    }

    if (!planKey && !planId) {
      return res.status(400).json({ success: false, message: 'Plan key or ID is required.' });
    }

    // STEP 1: Get user type first to determine which plans they can have
    const userCheck = await queryAsync('SELECT id, fullName, email, userType FROM users WHERE id = ?', [userId]);
    if (!userCheck.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const targetUser = userCheck[0];
    const userType = targetUser.userType;
    
    console.log('👤 Target user type:', userType);

    let finalPlanKey = planKey;

    // Get plan key from ID if needed
    if (planId && !planKey && await tableExists('plans')) {
      console.log('🔍 Looking up plan by ID:', planId);
      const planRows = await queryAsync('SELECT `key` FROM plans WHERE id = ?', [planId]);
      if (!planRows.length) {
        return res.status(404).json({ success: false, message: 'Plan not found.' });
      }
      finalPlanKey = planRows[0].key;
      console.log('✅ Found plan key:', finalPlanKey);
    }

    // STEP 2: Verify plan exists and matches user type
    let planDetails = null;
    if (await tableExists('plans')) {
      // CRITICAL FIX: Filter plans based on user type
      let planQuery;
      let planParams;
      
      if (userType === 'merchant') {
        // Merchants can only have merchant plans
        planQuery = 'SELECT * FROM plans WHERE `key` = ? AND isActive = 1 AND type = "merchant"';
        planParams = [finalPlanKey];
      } else {
        // Regular users can only have user plans
        planQuery = 'SELECT * FROM plans WHERE `key` = ? AND isActive = 1 AND type = "user"';
        planParams = [finalPlanKey];
      }
      
      console.log('🔍 Plan validation query:', planQuery, planParams);
      
      const planResult = await queryAsync(planQuery, planParams);
      if (!planResult.length) {
        const userTypeText = userType === 'merchant' ? 'merchant' : 'user';
        return res.status(400).json({ 
          success: false, 
          message: `Invalid plan or plan not available for ${userTypeText}s. This plan is not compatible with ${userTypeText} accounts.` 
        });
      }
      planDetails = planResult[0];
      console.log('✅ Plan validation successful for user type:', userType, 'Plan details:', planDetails);
    }

    const adminUserId = getAdminUserId(req);

    // STEP 3: Update user with validated plan
    const updateQuery = `
      UPDATE users SET 
        membershipType = ?, 
        currentPlan = ?,
        planAssignedAt = NOW(), 
        planAssignedBy = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    console.log('🔄 Executing plan assignment update...', {
      membershipType: finalPlanKey,
      currentPlan: finalPlanKey,
      planAssignedBy: adminUserId,
      userId: userId
    });

    const result = await queryAsync(updateQuery, [
      finalPlanKey,    // membershipType (varchar)
      finalPlanKey,    // currentPlan (varchar) - keeping both for compatibility
      adminUserId,     // planAssignedBy
      userId          // WHERE condition
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Failed to update user plan.' });
    }

    console.log('✅ Plan assignment successful, affected rows:', result.affectedRows);

    // Log activity if activities table exists
    if (await tableExists('activities')) {
      try {
        await queryAsync(
          'INSERT INTO activities (type, title, description, userId, timestamp) VALUES (?, ?, ?, ?, NOW())',
          [
            'plan_assigned',
            'Plan Assignment',
            `${planDetails?.name || finalPlanKey} plan assigned to ${userType} ${targetUser.fullName}`,
            adminUserId
          ]
        );
        console.log('✅ Activity logged successfully');
      } catch (activityError) {
        console.warn('⚠️ Error logging activity:', activityError);
      }
    }

    // Return updated user data
    const updatedUser = await queryAsync(`
      SELECT 
        u.id, u.fullName, u.email, u.membershipType, u.currentPlan, u.userType,
        u.planAssignedAt, u.planAssignedBy,
        p.name as planName, p.price as planPrice, p.currency, p.features, p.type as planType
      FROM users u
      LEFT JOIN plans p ON u.membershipType = p.key
      WHERE u.id = ?
    `, [userId]);

    const responseData = {
      success: true,
      message: `Plan assigned successfully to ${userType}`,
      user: updatedUser[0] || null,
      planDetails: planDetails
    };

    console.log('🎉 Plan assignment response:', responseData);

    res.json(responseData);

  } catch (err) {
    console.error('❌ Error assigning plan to user:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error assigning plan.',
      error: err.message 
    });
  }
});

router.post('/users/bulk-action', auth, admin, async (req, res) => {
  try {
    const { action, userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'User IDs are required' });
    }

    if (!['approve', 'reject', 'suspend', 'activate'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const validUserIds = userIds.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    if (validUserIds.length !== userIds.length) {
      return res.status(400).json({ success: false, message: 'All user IDs must be valid numbers' });
    }

    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      suspend: 'suspended',
      activate: 'approved'
    };

    const newStatus = statusMap[action];
    const adminUserId = getAdminUserId(req);
    const placeholders = validUserIds.map(() => '?').join(',');

    const hasStatusUpdatedAt = await columnExists('users', 'statusUpdatedAt');
    const hasStatusUpdatedBy = await columnExists('users', 'statusUpdatedBy');

    let updateQuery = `UPDATE users SET status = ?, updated_at = NOW()`;
    let params = [newStatus];

    if (hasStatusUpdatedAt) {
      updateQuery += ', statusUpdatedAt = NOW()';
    }

    if (hasStatusUpdatedBy) {
      updateQuery += ', statusUpdatedBy = ?';
      params.push(adminUserId);
    }

    updateQuery += ` WHERE id IN (${placeholders})`;
    params.push(...validUserIds);

    const result = await queryAsync(updateQuery, params);

    if (await tableExists('activities')) {
      try {
        await queryAsync(
          'INSERT INTO activities (type, description, userId, timestamp) VALUES (?, ?, ?, NOW())',
          [`bulk_${action}`, `Bulk ${action} performed on ${validUserIds.length} users by admin`, adminUserId]
        );
      } catch (activityError) {
        console.warn('Error logging bulk activity:', activityError);
      }
    }

    res.json({
      success: true,
      message: `Successfully ${action}d ${result.affectedRows} users`,
      affectedCount: result.affectedRows
    });
  } catch (err) {
    console.error('Error performing bulk action:', err);
    res.status(500).json({ success: false, message: 'Server error performing bulk action' });
  }
});

router.get('/users/export', auth, admin, async (req, res) => {
  try {
    const {
      status,
      userType,
      membershipType,
      community,
      search,
      dateFrom,
      dateTo
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    if (userType && userType !== 'all') {
      whereClause += ' AND u.userType = ?';
      params.push(userType);
    }

    if (membershipType && membershipType !== 'all') {
      if (membershipType === 'none') {
        whereClause += ' AND (u.membershipType IS NULL OR u.membershipType = "")';
      } else {
        whereClause += ' AND u.membershipType = ?';
        params.push(membershipType);
      }
    }

    if (community && community !== 'all') {
      whereClause += ' AND u.community = ?';
      params.push(community);
    }

    if (search && search.trim()) {
      whereClause += ' AND (u.fullName LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (dateFrom) {
      whereClause += ' AND DATE(u.createdAt) >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND DATE(u.createdAt) <= ?';
      params.push(dateTo);
    }

    let exportQuery = `
      SELECT 
        u.id, u.fullName, u.email, u.phone, u.community, u.membershipType,
        u.userType, u.status, u.createdAt, u.lastLogin,
        u.country, u.state, u.city, u.membershipNumber`;

    if (await tableExists('plans')) {
      exportQuery += `, p.name as planName, p.price as planPrice`;
    }

    exportQuery += ` FROM users u`;

    if (await tableExists('plans')) {
      exportQuery += ` LEFT JOIN plans p ON u.membershipType = p.key`;
    }

    exportQuery += ` ${whereClause} ORDER BY u.createdAt DESC`;

    const users = await queryAsync(exportQuery, params);

    const headers = [
      'ID', 'Full Name', 'Email', 'Phone', 'Community', 'Plan', 'User Type',
      'Status', 'Registration Date', 'Last Login', 'Country', 'State', 'City',
      'Membership Number'
    ];

    const csvRows = [headers.join(',')];

    users.forEach(user => {
      const row = [
        user.id,
        `"${user.fullName || ''}"`,
        user.email || '',
        user.phone || '',
        user.community || '',
        user.planName || user.membershipType || '',
        user.userType || '',
        user.status || '',
        user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
        user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '',
        user.country || '',
        user.state || '',
        user.city || '',
        user.membershipNumber || ''
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting users:', err);
    res.status(500).json({ success: false, message: 'Server error exporting users' });
  }
});

// ===== COMMUNITIES MANAGEMENT =====
router.get('/communities', auth, admin, async (req, res) => {
  try {
    let communities = [];
    
    if (await tableExists('communities')) {
      communities = await queryAsync('SELECT * FROM communities ORDER BY displayOrder, name');
    }

    if (communities.length === 0) {
      return res.json({
        success: true,
        communities: [
          'Gujarati', 'Bengali', 'Tamil', 'Punjabi', 'Hindi', 'Marathi',
          'Telugu', 'Kannada', 'Malayalam', 'Sindhi', 'Rajasthani',
          'Other Indian', 'Mixed Heritage'
        ].map(name => ({ name, isActive: true }))
      });
    }

    res.json({ success: true, communities });
  } catch (err) {
    console.error('Error fetching communities:', err);
    res.json({
      success: true,
      communities: [
        'Gujarati', 'Bengali', 'Tamil', 'Punjabi', 'Hindi', 'Marathi',
        'Telugu', 'Kannada', 'Malayalam', 'Sindhi', 'Rajasthani',
        'Other Indian', 'Mixed Heritage'
      ].map(name => ({ name, isActive: true }))
    });
  }
});

// ===== PLANS MANAGEMENT ===== 
// UPDATED: Enhanced Plans Endpoint with User Type Filtering
router.get('/plans', auth, admin, async (req, res) => {
  try {
    const { userType } = req.query; // NEW: Optional userType filter
    
    let plans = [];
    
    if (await tableExists('plans')) {
      // FIXED: Updated query to match your exact schema with optional filtering
      let plansQuery = `
        SELECT id, \`key\`, name, description, price, currency, billingCycle,
               features, dealAccess, type, isActive, priority, created_at, maxUsers, max_deals_per_month
        FROM plans
        WHERE isActive = 1
      `;
      
      const queryParams = [];
      
      // NEW: Filter by user type if provided
      if (userType && userType !== 'all') {
        if (userType === 'merchant') {
          plansQuery += ' AND type = "merchant"';
        } else if (userType === 'user') {
          plansQuery += ' AND type = "user"';
        }
      }
      
      plansQuery += ' ORDER BY priority ASC, name ASC';
      
      console.log('🔍 Plans query:', plansQuery, 'for userType:', userType);
      
      plans = await queryAsync(plansQuery, queryParams);
      
      console.log('✅ Plans fetched:', plans.length, 'plans');
    }

    if (plans.length === 0) {
      // Fallback plans - separated by user type
      const fallbackPlans = [
        // User Plans
        {
          id: 1,
          key: 'community',
          name: 'Community Plan',
          type: 'user',
          price: 0,
          currency: 'FREE',
          features: 'Basic directory access,Community updates,Basic support',
          dealAccess: 'Limited community deals',
          isActive: true,
          priority: 1
        },
        {
          id: 2,
          key: 'silver',
          name: 'Silver Plan',
          type: 'user',
          price: 50,
          currency: 'GHS',
          features: 'All community features,Priority support,Exclusive deals,Event notifications',
          dealAccess: 'Silver + Community deals',
          isActive: true,
          priority: 2
        },
        {
          id: 3,
          key: 'gold',
          name: 'Gold Plan',
          type: 'user',
          price: 150,
          currency: 'GHS',
          features: 'All silver features,VIP events,Premium support,Business networking,Priority customer service',
          dealAccess: 'All exclusive deals',
          isActive: true,
          priority: 3
        },
        // Merchant Plans
        {
          id: 4,
          key: 'basic_business',
          name: 'Basic Business',
          type: 'merchant',
          price: 100,
          currency: 'GHS',
          features: 'Basic business listing,Contact information,Business hours',
          dealAccess: 'Basic deal posting',
          isActive: true,
          priority: 4
        },
        {
          id: 5,
          key: 'premium_business',
          name: 'Premium Business',
          type: 'merchant',
          price: 200,
          currency: 'GHS',
          features: 'Premium listing,Photos,Reviews,Analytics,Priority support',
          dealAccess: 'Unlimited deal posting',
          isActive: true,
          priority: 5
        }
      ];
      
      // Filter fallback plans by userType if specified
      if (userType && userType !== 'all') {
        plans = fallbackPlans.filter(plan => {
          if (userType === 'merchant') return plan.type === 'merchant';
          if (userType === 'user') return plan.type === 'user';
          return true;
        });
      } else {
        plans = fallbackPlans;
      }
    }

    const responseData = {
      success: true,
      plans,
      filteredBy: userType || 'all',
      count: plans.length
    };

    console.log('📋 Plans response:', responseData);
    res.json(responseData);
    
  } catch (err) {
    console.error('Error fetching plans:', err);
    
    // Return error-safe fallback
    const fallbackPlans = [
      {
        id: 1,
        key: 'community',
        name: 'Community Plan',
        type: 'user',
        price: 0,
        currency: 'FREE',
        features: 'Basic directory access,Community updates,Basic support',
        dealAccess: 'Limited community deals',
        isActive: true,
        priority: 1
      }
    ];
    
    res.json({
      success: true,
      plans: fallbackPlans,
      filteredBy: 'fallback',
      count: fallbackPlans.length
    });
  }
});

module.exports = router;
