// Admin routes - Complete Enhanced MySQL implementation with all fixes
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { auth, admin } = require('../middleware/auth');
const db = require('../db');
const { generateMembershipNumber } = require('../utils/membershipGenerator');
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



    if (community && community !== 'all') {
      whereClause += ' AND u.community = ?';
      params.push(community);
    }

    if (search && search.trim()) {
      whereClause += ' AND (u.fullName LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.membershipNumber LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
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

// Replace existing /users/export handler with enhanced CSV including address, dob, validationDate, bloodGroup
router.get('/users/export', auth, admin, async (req, res) => {
  try {
    const {
      status,
      userType,
      community,
      search
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

    if (community && community !== 'all') {
      whereClause += ' AND u.community = ?';
      params.push(community);
    }

    if (search && search.trim()) {
      whereClause += ' AND (u.fullName LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.membershipNumber LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Select additional fields requested: address, dob, validationDate, bloodGroup
    let exportQuery = `
      SELECT 
        u.id, u.fullName, u.email, u.phone, u.address, u.dob, u.community, u.membershipType,
        u.userType, u.status, u.createdAt, u.lastLogin, u.validationDate, u.bloodGroup,
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
      'ID', 'Full Name', 'Email', 'Phone', 'Address', 'DOB', 'Community', 'Plan', 'User Type',
      'Status', 'Registration Date', 'Last Login', 'Validation Date', 'Blood Group', 'Country', 'State', 'City',
      'Membership Number'
    ];

    // helper to safely escape CSV values
    const csvSafe = (val) => {
      if (val === null || val === undefined) return '';
      const s = typeof val === 'string' ? val : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '';

    const csvRows = [headers.join(',')];

    users.forEach(user => {
      const row = [
        user.id,
        csvSafe(user.fullName || ''),
        user.email || '',
        user.phone || '',
        csvSafe(user.address || ''),
        fmtDate(user.dob),
        user.community || '',
        user.planName || user.membershipType || '',
        user.userType || '',
        user.status || '',
        user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
        user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '',
        user.validationDate ? new Date(user.validationDate).toLocaleDateString() : '',
        user.bloodGroup || '',
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
      status,
      bloodGroup
    } = req.body;

    const existingUser = await queryAsync('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Generate new format membershipNumber only for users (not merchants)
    const membershipNumber = generateMembershipNumber();

    let addressData = address;
    if (typeof address === 'object') {
      addressData = JSON.stringify(address);
    }

    const adminUserId = getAdminUserId(req);

    const result = await queryAsync(`
      INSERT INTO users (
        fullName, email, password, phone, userType, membershipType, community,
        address, city, state, country, dob, status, membershipNumber, bloodGroup,
        createdAt, planAssignedAt, planAssignedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)
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
      bloodGroup || null,
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

// DELETE /users/:id endpoint removed as per requirements

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

    let updateQuery = 'UPDATE users SET status = ?, updated_at = NOW(), statusUpdatedAt = NOW()';
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

    // Calculate validationDate based on billingCycle
    let validationDate = new Date();
    const billingCycle = (planDetails && planDetails.billingCycle) ? planDetails.billingCycle.toLowerCase() : 'yearly';
    switch (billingCycle) {
      case 'monthly':
        validationDate.setMonth(validationDate.getMonth() + 1);
        break;
      case 'quarterly':
        validationDate.setMonth(validationDate.getMonth() + 3);
        break;
      case 'yearly':
      case 'annual':
        validationDate.setFullYear(validationDate.getFullYear() + 1);
        break;
      case 'lifetime':
        validationDate = null;
        break;
      case 'weekly':
        validationDate.setDate(validationDate.getDate() + 7);
        break;
      default:
        validationDate.setFullYear(validationDate.getFullYear() + 1);
        break;
    }

    let updateQuery, updateParams;
    if (validationDate) {
      updateQuery = `
        UPDATE users SET 
          membershipType = ?, 
          planAssignedAt = NOW(), 
          planAssignedBy = ?,
          validationDate = ?,
          updated_at = NOW()
        WHERE id = ?
      `;
      updateParams = [
        finalPlanKey,
        adminUserId,
        validationDate.toISOString().slice(0, 19).replace('T', ' '),
        userId
      ];
    } else {
      updateQuery = `
        UPDATE users SET 
          membershipType = ?, 
          planAssignedAt = NOW(), 
          planAssignedBy = ?,
          validationDate = NULL,
          updated_at = NOW()
        WHERE id = ?
      `;
      updateParams = [
        finalPlanKey,
        adminUserId,
        userId
      ];
    }

    console.log('🔄 Executing plan assignment update...', {
      membershipType: finalPlanKey,
      currentPlan: finalPlanKey,
      planAssignedBy: adminUserId,
      userId: userId,
      validationDate: validationDate
    });

    const result = await queryAsync(updateQuery, updateParams);

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

// POST /users/bulk-action endpoint delete logic removed as per requirements

router.get('/users/export', auth, admin, async (req, res) => {
  try {
    const {
      status,
      userType,
      community,
      search
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

    if (community && community !== 'all') {
      whereClause += ' AND u.community = ?';
      params.push(community);
    }

    if (search && search.trim()) {
      whereClause += ' AND (u.fullName LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
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
  communities = await queryAsync('SELECT * FROM communities ORDER BY name');
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

// ===== BUSINESS CATEGORIES MANAGEMENT =====
router.get('/business-categories', auth, admin, async (req, res) => {
  try {
    // First try to get from dynamic settings
    const settingsQuery = 'SELECT value FROM settings WHERE `key` = "dynamicFields.businessCategories"';
    
    if (await tableExists('settings')) {
      const settingsResults = await queryAsync(settingsQuery);
      if (settingsResults.length > 0) {
        try {
          const businessCategories = JSON.parse(settingsResults[0].value);
          const activeCategories = businessCategories.filter(bc => bc.isActive !== false);
          return res.json({
            success: true,
            categories: activeCategories
          });
        } catch (parseError) {
          console.warn('Error parsing business categories from settings:', parseError);
        }
      }
    }

    // Fallback to defaults
    const defaultCategories = [
      { name: 'restaurant', label: 'Restaurant & Food', description: 'Restaurants, food services, catering', isActive: true },
      { name: 'retail', label: 'Retail & Shopping', description: 'Retail stores, shopping centers', isActive: true },
      { name: 'services', label: 'Professional Services', description: 'Consulting, legal, accounting, etc.', isActive: true },
      { name: 'healthcare', label: 'Healthcare', description: 'Medical, dental, wellness services', isActive: true },
      { name: 'technology', label: 'Technology', description: 'IT services, software, tech products', isActive: true },
      { name: 'other', label: 'Other', description: 'Other business types', isActive: true }
    ];

    res.json({
      success: true,
      categories: defaultCategories
    });
  } catch (err) {
    console.error('Error fetching business categories:', err);
    res.status(500).json({ success: false, message: 'Server error fetching business categories' });
  }
});


// ===== PLANS MANAGEMENT ===== 
// UPDATED: Enhanced Plans Endpoint with User Type Filtering
router.get('/plans', auth, admin, async (req, res) => {
  try {
    let { userType } = req.query; // NEW: Optional userType filter
    // Sanitize userType: only allow 'user' or 'merchant', default to 'user'
    if (userType && userType !== 'user' && userType !== 'merchant') {
      userType = 'user';
    }

    let plans = [];

    if (await tableExists('plans')) {
      // FIXED: Updated query to match your exact schema with optional filtering
      let plansQuery = `
        SELECT id, \`key\`, name, description, price, currency, billingCycle,
               features, dealAccess, type, isActive, priority, created_at, maxUsers, max_deals_per_month
        FROM plans
      `;

      const queryParams = [];

      // NEW: Filter by user type if provided
      if (userType && userType !== 'all') {
        if (userType === 'merchant') {
          plansQuery += ' WHERE type = "merchant"';
        } else if (userType === 'user') {
          plansQuery += ' WHERE type = "user"';
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

// ===== MERCHANTS MANAGEMENT - REMOVED =====
// All merchant routes have been consolidated under /partners routes for consistency

// ===== PARTNER ROUTE ALIASES =====
// These routes alias the merchant routes for admin partner management

// Get all partners (alias for merchants)
router.get('/partners', auth, admin, async (req, res) => {
  try {
    const {
      status,
      category,
      search,
      dateFrom,
      dateTo,
      limit = 20,
      offset = 0
    } = req.query;

    let whereClause = 'WHERE u.userType = "merchant"';
    const params = [];

    // Apply filters
    if (status && status !== 'all') {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      whereClause += ' AND (u.fullName LIKE ? OR u.email LIKE ? OR b.businessName LIKE ? OR u.phone LIKE ?)';
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

    if (category && category !== 'all') {
      whereClause += ' AND b.businessCategory = ?';
      params.push(category);
    }

    // Check if businesses table exists
    const businessTableExists = await tableExists('businesses');
    
    let query;
    if (businessTableExists) {
      query = `
        SELECT 
          u.id, u.fullName, u.email, u.phone, u.address, u.community, 
          u.membershipType, u.status, u.createdAt, u.lastLogin,
          b.businessId, b.businessName, b.businessDescription, b.businessCategory,
          b.businessAddress, b.businessPhone, b.businessEmail, b.website,
          b.businessLicense, b.taxId, b.customDealLimit,
          p.name as planName, p.price as planPrice, p.billingCycle, p.currency, p.features,
          p.max_deals_per_month as planMaxDeals
        FROM users u
        LEFT JOIN businesses b ON u.id = b.userId
        LEFT JOIN plans p ON u.membershipType = p.key
        ${whereClause}
        ORDER BY u.createdAt DESC
        LIMIT ? OFFSET ?
      `;
    } else {
      // Fallback query without businesses table
      query = `
        SELECT 
          u.id, u.fullName, u.email, u.phone, u.address, u.community, 
          u.membershipType, u.status, u.createdAt, u.lastLogin,
          NULL as businessId, NULL as businessName, NULL as businessDescription, 
          NULL as businessCategory, NULL as businessAddress, NULL as businessPhone, 
          NULL as businessEmail, NULL as website, NULL as businessLicense, 
          NULL as taxId, NULL as customDealLimit,
          p.name as planName, p.price as planPrice, p.billingCycle, p.currency, p.features,
          p.max_deals_per_month as planMaxDeals
        FROM users u
        LEFT JOIN plans p ON u.membershipType = p.key
        ${whereClause}
        ORDER BY u.createdAt DESC
        LIMIT ? OFFSET ?
      `;
    }

    params.push(parseInt(limit), parseInt(offset));
    const merchants = await queryAsync(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM users u`;
    if (businessTableExists) {
      countQuery += ' LEFT JOIN businesses b ON u.id = b.userId';
    }
    countQuery += ` ${whereClause}`;
    
    const countParams = params.slice(0, -2); // Remove limit and offset
    const totalResult = await queryAsync(countQuery, countParams);
    const totalMerchants = totalResult[0]?.total || 0;

    res.json({
      success: true,
      merchants,
      totalMerchants,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalMerchants
      }
    });
  } catch (err) {
    console.error('Error fetching partners:', err);
    res.status(500).json({ success: false, message: 'Server error fetching partners' });
  }
});

// Get single partner (alias for merchant)
router.get('/partners/:id', auth, admin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.id);
    if (!merchantId || isNaN(merchantId)) {
      return res.status(400).json({ success: false, message: 'Valid partner ID is required' });
    }

    // Check if businesses table exists
    const businessTableExists = await tableExists('businesses');
    
    let query;
    if (businessTableExists) {
      query = `
        SELECT 
          u.id, u.fullName, u.email, u.phone, u.address, u.community, 
          u.membershipType, u.status, u.createdAt, u.lastLogin,
          b.businessId, b.businessName, b.businessDescription, b.businessCategory,
          b.businessAddress, b.businessPhone, b.businessEmail, b.website,
          b.businessLicense, b.taxId, b.customDealLimit,
          p.name as planName, p.price as planPrice, p.billingCycle, p.currency, p.features,
          p.max_deals_per_month as planMaxDeals
        FROM users u
        LEFT JOIN businesses b ON u.id = b.userId
        LEFT JOIN plans p ON u.membershipType = p.key
        WHERE u.id = ? AND u.userType = "merchant"
      `;
    } else {
      query = `
        SELECT 
          u.id, u.fullName, u.email, u.phone, u.address, u.community, 
          u.membershipType, u.status, u.createdAt, u.lastLogin,
          NULL as businessId, NULL as businessName, NULL as businessDescription, 
          NULL as businessCategory, NULL as businessAddress, NULL as businessPhone, 
          NULL as businessEmail, NULL as website, NULL as businessLicense, 
          NULL as taxId, NULL as customDealLimit,
          p.name as planName, p.price as planPrice, p.billingCycle, p.currency, p.features,
          p.max_deals_per_month as planMaxDeals
        FROM users u
        LEFT JOIN plans p ON u.membershipType = p.key
        WHERE u.id = ? AND u.userType = "merchant"
      `;
    }

    const result = await queryAsync(query, [merchantId]);
    
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    const partner = result[0];
    
    res.json({ 
      success: true, 
      partner: partner
    });
  } catch (err) {
    console.error('Error fetching partner:', err);
    res.status(500).json({ success: false, message: 'Server error fetching partner' });
  }
});

// Get all businesses (for deal forms and dropdowns)
router.get('/businesses', auth, admin, async (req, res) => {
  try {
    if (!(await tableExists('businesses'))) {
      return res.json({
        success: true,
        businesses: [],
        message: 'Businesses table not found'
      });
    }

    const query = `
      SELECT 
        b.businessId, 
        b.businessName, 
        b.businessCategory, 
        u.status as businessStatus,
        u.fullName as ownerName,
        u.email as ownerEmail,
        u.status as userStatus
      FROM businesses b
      LEFT JOIN users u ON b.userId = u.id
      WHERE u.userType = "merchant" AND u.status = "approved"
      ORDER BY b.businessName ASC
    `;
    
    const businesses = await queryAsync(query);
    
    res.json({
      success: true,
      businesses
    });
  } catch (err) {
    console.error('Error fetching businesses:', err);
    res.status(500).json({ success: false, message: 'Server error fetching businesses' });
  }
});

router.get('/businesses/:id', auth, admin, async (req, res) => {
  try {
    const businessId = req.params.id;
    
    if (!(await tableExists('businesses'))) {
      return res.status(404).json({ success: false, message: 'Businesses table not found' });
    }

    const businessQuery = `
      SELECT b.*, u.fullName, u.email as userEmail, u.phone as userPhone
      FROM businesses b
      LEFT JOIN users u ON b.userId = u.id
      WHERE b.businessId = ? OR b.userId = ?
    `;

    const businesses = await queryAsync(businessQuery, [businessId, businessId]);

    if (!businesses.length) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    res.json({
      success: true,
      business: businesses[0]
    });
  } catch (err) {
    console.error('Error fetching business:', err);
    res.status(500).json({ success: false, message: 'Server error fetching business' });
  }
});


// Create partner (alias for merchant)
router.post('/partners', auth, admin, async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      address,
      community,
      membershipType,
      status,
      businessInfo,
      bloodGroup
    } = req.body;

    // Check if email already exists
    const existingUser = await queryAsync('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }


    // Generate membership number for merchant using the same format as self-registration
    const membershipNumber = generateMembershipNumber();

    // Get default merchant plan key (fix ORDER BY displayOrder bug)
    let defaultMerchantPlanKey = 'basic_business';
    try {
      const planRows = await queryAsync("SELECT `key` FROM plans WHERE type = 'merchant' AND isActive = 1 ORDER BY priority DESC LIMIT 1");
      if (planRows.length > 0) {
        defaultMerchantPlanKey = planRows[0].key;
      }
    } catch (e) {
      // fallback to basic_business
    }

    // Generate random temp password for merchant
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const userResult = await queryAsync(
      'INSERT INTO users (fullName, email, password, phone, address, community, membershipType, userType, status, membershipNumber, bloodGroup) VALUES (?, ?, ?, ?, ?, ?, ?, "merchant", ?, ?, ?)',
      [fullName, email, hashedPassword, phone, address, community, membershipType || defaultMerchantPlanKey, status || 'pending', membershipNumber, bloodGroup || null]
    );

    const userId = userResult.insertId;

    // Create business record if businessInfo provided and table exists
    let businessId = null;
    if (businessInfo && await tableExists('businesses')) {
      businessId = `BIZ${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
      await queryAsync(
        'INSERT INTO businesses (businessId, userId, businessName, businessDescription, businessCategory, businessAddress, businessPhone, businessEmail, website, businessLicense, taxId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          businessId,
          userId,
          businessInfo.businessName,
          businessInfo.businessDescription,
          businessInfo.businessCategory,
          businessInfo.businessAddress,
          businessInfo.businessPhone,
          businessInfo.businessEmail,
          businessInfo.website,
          businessInfo.businessLicense,
          businessInfo.taxId
        ]
      );
    }

    res.json({ 
      success: true, 
      message: 'Partner created successfully',
      userId: userId,
      businessId: businessId,
      membershipNumber: membershipNumber,
      tempPassword: tempPassword
    });
  } catch (err) {
    console.error('Error creating partner:', err);
    res.status(500).json({ success: false, message: 'Server error creating partner' });
  }
});

// Update partner
router.put('/partners/:id', auth, admin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.id);
    if (!merchantId || isNaN(merchantId)) {
      return res.status(400).json({ success: false, message: 'Valid partner ID is required' });
    }

    // Accept both legacy flat and new userInfo/businessInfo payloads
    let userInfo = req.body.userInfo || {};
    let businessInfo = req.body.businessInfo || {};
    // If flat fields (from old frontend), map them to userInfo/businessInfo
    const flat = req.body;
    // User fields
    const allowedUserFields = ['fullName', 'ownerName', 'email', 'phone', 'address', 'community', 'membershipType', 'status'];
    allowedUserFields.forEach(field => {
      if (flat[field] !== undefined && userInfo[field] === undefined) {
        userInfo[field] = flat[field];
      }
    });
    // Business fields
    const allowedBusinessFields = [
      'businessName', 'businessDescription', 'description', 'businessCategory', 'category', 'businessAddress',
      'address', 'city', 'state', 'zipCode', 'businessPhone', 'phone', 'businessEmail', 'email', 'website', 
      'businessLicense', 'taxId', 'planType', 'plan', 'customDealLimit'
    ];
    allowedBusinessFields.forEach(field => {
      if (flat[field] !== undefined && businessInfo[field] === undefined) {
        businessInfo[field] = flat[field];
      }
    });

    // Map ownerName to fullName for userInfo
    if (userInfo.ownerName && !userInfo.fullName) userInfo.fullName = userInfo.ownerName;
    if (businessInfo.category && !businessInfo.businessCategory) businessInfo.businessCategory = businessInfo.category;
    if (businessInfo.description && !businessInfo.businessDescription) businessInfo.businessDescription = businessInfo.description;
    if (businessInfo.planType && !userInfo.membershipType) userInfo.membershipType = businessInfo.planType;
    if (businessInfo.plan && !userInfo.membershipType) userInfo.membershipType = businessInfo.plan;

    // Update user information
    const userUpdates = [];
    const userValues = [];
    const userDbFields = ['fullName', 'email', 'phone', 'address', 'community', 'membershipType', 'status'];
    userDbFields.forEach(field => {
      if (userInfo[field] !== undefined) {
        userUpdates.push(`${field} = ?`);
        userValues.push(userInfo[field]);
      }
    });
    if (userUpdates.length > 0) {
      userUpdates.push('updated_at = NOW()');
      userValues.push(merchantId);
      const userUpdateQuery = `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ? AND userType = "merchant"`;
      await queryAsync(userUpdateQuery, userValues);
    }

    // Update business information if table exists
    if (await tableExists('businesses')) {
      const businessDbFields = [
        'businessName', 'businessDescription', 'businessCategory', 'businessAddress',
        'businessPhone', 'businessEmail', 'website', 'businessLicense', 'taxId', 'customDealLimit'
      ];
      const businessUpdates = [];
      const businessValues = [];
      // Compose businessAddress if needed
      if (!businessInfo.businessAddress) {
        let addr = businessInfo.address || '';
        if (businessInfo.city) addr += (addr ? ', ' : '') + businessInfo.city;
        if (businessInfo.state) addr += (addr ? ', ' : '') + businessInfo.state;
        if (businessInfo.zipCode) addr += (addr ? ', ' : '') + businessInfo.zipCode;
        if (addr) businessInfo.businessAddress = addr;
      }
      businessDbFields.forEach(field => {
        if (businessInfo[field] !== undefined) {
          businessUpdates.push(`${field} = ?`);
          businessValues.push(businessInfo[field]);
        }
      });
      if (businessUpdates.length > 0) {
        businessUpdates.push('updated_at = NOW()');
        businessValues.push(merchantId);
        const businessUpdateQuery = `UPDATE businesses SET ${businessUpdates.join(', ')} WHERE userId = ?`;
        await queryAsync(businessUpdateQuery, businessValues);
      }
    }

    res.json({ success: true, message: 'Partner updated successfully' });
  } catch (err) {
    console.error('Error updating partner:', err);
    res.status(500).json({ success: false, message: 'Server error updating partner' });
  }
});

// Approve partner
router.post('/partners/:id/approve', auth, admin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.id);
    if (!merchantId || isNaN(merchantId)) {
      return res.status(400).json({ success: false, message: 'Valid partner ID is required' });
    }

    const result = await queryAsync(
      'UPDATE users SET status = "approved", updated_at = NOW() WHERE id = ? AND userType = "merchant"',
      [merchantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    res.json({ success: true, message: 'Partner approved successfully' });
  } catch (err) {
    console.error('Error approving partner:', err);
    res.status(500).json({ success: false, message: 'Server error approving partner' });
  }
});

// Reject partner
router.post('/partners/:id/reject', auth, admin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.id);
    if (!merchantId || isNaN(merchantId)) {
      return res.status(400).json({ success: false, message: 'Valid partner ID is required' });
    }

    const result = await queryAsync(
      'UPDATE users SET status = "rejected", updated_at = NOW() WHERE id = ? AND userType = "merchant"',
      [merchantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    res.json({ success: true, message: 'Partner rejected successfully' });
  } catch (err) {
    console.error('Error rejecting partner:', err);
    res.status(500).json({ success: false, message: 'Server error rejecting partner' });
  }
});

// Update partner status
router.put('/partners/:id/status', auth, admin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.id);
    const { status } = req.body;

    if (!merchantId || isNaN(merchantId)) {
      return res.status(400).json({ success: false, message: 'Valid partner ID is required' });
    }

    if (!status || !['approved', 'rejected', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status is required' });
    }

    const result = await queryAsync(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ? AND userType = "merchant"',
      [status, merchantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    res.json({ success: true, message: 'Partner status updated successfully' });
  } catch (err) {
    console.error('Error updating partner status:', err);
    res.status(500).json({ success: false, message: 'Server error updating partner status' });
  }
});

// Delete partner
router.delete('/partners/:id', auth, admin, async (req, res) => {
  try {
    const partnerId = parseInt(req.params.id);
    if (!partnerId || isNaN(partnerId)) {
      return res.status(400).json({ success: false, message: 'Valid partner ID is required' });
    }

    // Check if partner exists and is a merchant
    const existingPartner = await queryAsync(
      'SELECT id FROM users WHERE id = ? AND userType = "merchant"',
      [partnerId]
    );

    if (existingPartner.length === 0) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    // Delete from businesses table first (if exists)
    if (await tableExists('businesses')) {
      await queryAsync('DELETE FROM businesses WHERE userId = ?', [partnerId]);
    }

    // Delete the user
    const result = await queryAsync('DELETE FROM users WHERE id = ? AND userType = "merchant"', [partnerId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    res.json({ success: true, message: 'Partner deleted successfully' });
  } catch (err) {
    console.error('Error deleting partner:', err);
    res.status(500).json({ success: false, message: 'Server error deleting partner' });
  }
});

// Bulk partner actions
router.post('/partners/bulk-action', auth, admin, async (req, res) => {
  try {
    const { action, merchantIds } = req.body;

    if (!action || !merchantIds || !Array.isArray(merchantIds) || merchantIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action and merchant IDs array are required' 
      });
    }

    // Validate action
    const validActions = ['approve', 'reject', 'suspend'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid action. Must be one of: ${validActions.join(', ')}` 
      });
    }

    // Validate all IDs are numbers
    const validIds = merchantIds.filter(id => !isNaN(parseInt(id)));
    if (validIds.length !== merchantIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'All merchant IDs must be valid numbers' 
      });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (const merchantId of validIds) {
      try {
        switch (action) {
          case 'approve':
            await queryAsync(
              'UPDATE users SET status = "approved", updated_at = NOW() WHERE id = ? AND userType = "merchant"',
              [merchantId]
            );
            break;
          case 'reject':
            await queryAsync(
              'UPDATE users SET status = "rejected", updated_at = NOW() WHERE id = ? AND userType = "merchant"',
              [merchantId]
            );
            break;
          case 'suspend':
            await queryAsync(
              'UPDATE users SET status = "suspended", updated_at = NOW() WHERE id = ? AND userType = "merchant"',
              [merchantId]
            );
            break;
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to ${action} merchant ${merchantId}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed. ${results.success} successful, ${results.failed} failed.`,
      results
    });
  } catch (err) {
    console.error('Error performing bulk partner action:', err);
    res.status(500).json({ success: false, message: 'Server error performing bulk action' });
  }
});

// Bulk user actions
router.post('/users/bulk-action', auth, admin, async (req, res) => {
  try {
    const { action, userIds } = req.body;

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action and user IDs array are required' 
      });
    }

    // Validate action
    const validActions = ['approve', 'reject', 'suspend'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid action. Must be one of: ${validActions.join(', ')}` 
      });
    }

    // Validate all IDs are numbers
    const validIds = userIds.filter(id => !isNaN(parseInt(id)));
    if (validIds.length !== userIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'All user IDs must be valid numbers' 
      });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (const userId of validIds) {
      try {
        switch (action) {
          case 'approve':
            await queryAsync(
              'UPDATE users SET status = "approved", updated_at = NOW() WHERE id = ? AND userType != "merchant"',
              [userId]
            );
            break;
          case 'reject':
            await queryAsync(
              'UPDATE users SET status = "rejected", updated_at = NOW() WHERE id = ? AND userType != "merchant"',
              [userId]
            );
            break;
          case 'suspend':
            await queryAsync(
              'UPDATE users SET status = "suspended", updated_at = NOW() WHERE id = ? AND userType != "merchant"',
              [userId]
            );
            break;
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to ${action} user ${userId}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed. ${results.success} successful, ${results.failed} failed.`,
      results
    });
  } catch (err) {
    console.error('Error performing bulk user action:', err);
    res.status(500).json({ success: false, message: 'Server error performing bulk action' });
  }
});

// ===== DEALS MANAGEMENT =====
router.get('/deals', auth, admin, async (req, res) => {
  try {
    if (!(await tableExists('deals'))) {
      return res.json({
        success: true,
        deals: [],
        message: 'Deals table not found'
      });
    }

    const {
      status,
      category,
      businessId,
      search,
      dateFrom,
      dateTo,
      sortBy = 'created_at',
      sortOrder = 'desc',
      limit = 20,
      offset = 0
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND d.status = ?';
      params.push(status);
    }

    if (category && category !== 'all') {
      whereClause += ' AND d.category = ?';
      params.push(category);
    }

    if (businessId && businessId !== 'all') {
      whereClause += ' AND d.businessId = ?';
      params.push(businessId);
    }

    if (search && search.trim()) {
      whereClause += ' AND (d.title LIKE ? OR d.description LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    if (dateFrom) {
      whereClause += ' AND DATE(d.created_at) >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND DATE(d.created_at) <= ?';
      params.push(dateTo);
    }

    // Validate sortBy to prevent SQL injection
    const allowedSortColumns = ['created_at', 'title', 'status', 'category', 'validUntil'];
    const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const businessTableExists = await tableExists('businesses');
    
    let query;
    if (businessTableExists) {
      query = `
        SELECT 
          d.*, 
          b.businessName,
          u.fullName as merchantName,
          u.email as merchantEmail
        FROM deals d
        LEFT JOIN businesses b ON d.businessId = b.businessId
        LEFT JOIN users u ON d.businessId = u.id
        ${whereClause}
        ORDER BY d.${validSortBy} ${validSortOrder}
        LIMIT ? OFFSET ?
      `;
    } else {
      query = `
        SELECT 
          d.*,
          NULL as merchantName,
          NULL as merchantEmail,
          NULL as businessName
        FROM deals d
        ${whereClause}
        ORDER BY d.${validSortBy} ${validSortOrder}
        LIMIT ? OFFSET ?
      `;
    }

    params.push(parseInt(limit), parseInt(offset));

    const deals = await queryAsync(query, params);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM deals d ${whereClause}`;
    const countParams = params.slice(0, -2);
    const countResult = await queryAsync(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      deals,
      total
    });
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching deals',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Get individual deal details
router.get('/deals/:id', auth, admin, async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);
    if (!dealId || isNaN(dealId)) {
      return res.status(400).json({ success: false, message: 'Valid deal ID is required' });
    }

    if (!(await tableExists('deals'))) {
      return res.status(404).json({ success: false, message: 'Deals table not found' });
    }

    const businessTableExists = await tableExists('businesses');
    
    let query;
    if (businessTableExists) {
      query = `
        SELECT 
          d.*, 
          b.businessName,
          b.businessCategory,
          b.businessPhone,
          b.businessEmail,
          b.businessAddress,
          b.website,
          b.businessLicense,
          b.taxId,
          b.isVerified,
          b.verificationDate,
          b.created_at as businessCreatedAt,
          b.businessDescription,
          u.fullName as merchantName,
          u.email as merchantEmail,
          u.membershipType
        FROM deals d
        LEFT JOIN businesses b ON d.businessId = b.businessId
        LEFT JOIN users u ON b.userId = u.id
        WHERE d.id = ?
      `;
    } else {
      query = `
        SELECT 
          d.*,
          NULL as merchantName,
          NULL as merchantEmail,
          NULL as businessName,
          NULL as businessCategory
        FROM deals d
        WHERE d.id = ?
      `;
    }

    const deals = await queryAsync(query, [dealId]);
    
    if (deals.length === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    res.json({
      success: true,
      deal: deals[0]
    });
  } catch (err) {
    console.error('Error fetching deal details:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching deal details',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Create new deal
router.post('/deals', auth, admin, [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
  body('description').trim().isLength({ min: 1, max: 1000 }).withMessage('Description is required and must be less than 1000 characters'),
  body('businessId').isString().notEmpty().withMessage('Valid business ID is required'),
  body('discount').isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required'),
  body('validFrom').isISO8601().withMessage('Valid from date is required'),
  body('validUntil').isISO8601().withMessage('Valid until date is required'),
  body('status').optional().isIn(['active', 'inactive', 'pending']).withMessage('Status must be active, inactive, or pending')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }



    if (!(await tableExists('deals'))) {
      return res.status(404).json({ success: false, message: 'Deals table not found' });
    }

    const {
      title,
      description,
      businessId,
      discount,
      discountType,
      originalPrice,
      discountedPrice,
      category,
      validFrom,
      validUntil,
      requiredPlanPriority = 1,
      termsConditions,
      couponCode,
      status = 'active'
    } = req.body;

    // Validate dates
    const fromDate = new Date(validFrom);
    const toDate = new Date(validUntil);
    if (toDate <= fromDate) {
      return res.status(400).json({
        success: false,
        message: 'Valid until date must be after valid from date'
      });
    }

    const query = `
      INSERT INTO deals (
        title, description, businessId, discount, discountType, originalPrice, 
        discountedPrice, category, validFrom, validUntil, requiredPlanPriority,
        minPlanPriority, termsConditions, couponCode, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      title, description, businessId, discount, discountType, originalPrice,
      discountedPrice, category, validFrom, validUntil, requiredPlanPriority,
      requiredPlanPriority, // Set minPlanPriority to same value for consistency
      termsConditions, couponCode, status
    ];

    const result = await queryAsync(query, params);

    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      dealId: result.insertId
    });
  } catch (err) {
    console.error('Error creating deal:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating deal',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Update deal
router.put('/deals/:id', auth, admin, [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
  body('description').trim().isLength({ min: 1, max: 1000 }).withMessage('Description is required and must be less than 1000 characters'),
  body('businessId').isString().notEmpty().withMessage('Valid business ID is required'),
  body('discount').isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required'),
  body('validFrom').isISO8601().withMessage('Valid from date is required'),
  body('validUntil').isISO8601().withMessage('Valid until date is required'),
  body('status').optional().isIn(['active', 'inactive', 'pending']).withMessage('Status must be active, inactive, or pending')
], async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);
    if (!dealId || isNaN(dealId)) {
      return res.status(400).json({ success: false, message: 'Valid deal ID is required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    if (!(await tableExists('deals'))) {
      return res.status(404).json({ success: false, message: 'Deals table not found' });
    }

    const {
      title,
      description,
      businessId,
      discount,
      discountType,
      originalPrice,
      discountedPrice,
      category,
      validFrom,
      validUntil,
      requiredPlanPriority = 1,
      termsConditions,
      couponCode,
      status = 'active'
    } = req.body;

    // Validate dates
    const fromDate = new Date(validFrom);
    const toDate = new Date(validUntil);
    if (toDate <= fromDate) {
      return res.status(400).json({
        success: false,
        message: 'Valid until date must be after valid from date'
      });
    }

    // Check if deal exists
    const existingDeal = await queryAsync('SELECT id FROM deals WHERE id = ?', [dealId]);
    if (existingDeal.length === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    const query = `
      UPDATE deals SET 
        title = ?, description = ?, businessId = ?, discount = ?, discountType = ?, 
        originalPrice = ?, discountedPrice = ?, category = ?, validFrom = ?, 
        validUntil = ?, requiredPlanPriority = ?, minPlanPriority = ?, termsConditions = ?, 
        couponCode = ?, status = ?
      WHERE id = ?
    `;

    const params = [
      title, description, businessId, discount, discountType, originalPrice,
      discountedPrice, category, validFrom, validUntil, requiredPlanPriority,
      requiredPlanPriority, // Set minPlanPriority to same value for consistency
      termsConditions, couponCode, status, dealId
    ];

    await queryAsync(query, params);

    res.json({
      success: true,
      message: 'Deal updated successfully'
    });
  } catch (err) {
    console.error('Error updating deal:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating deal',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Update deal status
router.patch('/deals/:id/status', auth, admin, [
  body('status').isIn(['active', 'inactive', 'pending']).withMessage('Status must be active, inactive, or pending')
], async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);
    if (!dealId || isNaN(dealId)) {
      return res.status(400).json({ success: false, message: 'Valid deal ID is required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    if (!(await tableExists('deals'))) {
      return res.status(404).json({ success: false, message: 'Deals table not found' });
    }

    const { status } = req.body;

    // Check if deal exists
    const existingDeal = await queryAsync('SELECT id FROM deals WHERE id = ?', [dealId]);
    if (existingDeal.length === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

  await queryAsync('UPDATE deals SET status = ? WHERE id = ?', [status, dealId]);

    res.json({
      success: true,
      message: `Deal ${status === 'active' ? 'activated' : 'deactivated'} successfully`
    });
  } catch (err) {
    console.error('Error updating deal status:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating deal status',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Get deal redemptions
router.get('/deals/:id/redemptions', auth, admin, async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);
    if (!dealId || isNaN(dealId)) {
      return res.status(400).json({ success: false, message: 'Valid deal ID is required' });
    }

    // Check if redemptions table exists, if not return empty array
    if (!(await tableExists('deal_redemptions'))) {
      return res.json({
        success: true,
        redemptions: [],
        message: 'Deal redemptions table not found'
      });
    }

    // Check if deal exists
    if (!(await tableExists('deals'))) {
      return res.status(404).json({ success: false, message: 'Deals table not found' });
    }

    const dealExists = await queryAsync('SELECT id FROM deals WHERE id = ?', [dealId]);
    if (dealExists.length === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    const query = `
      SELECT 
        dr.*,
        u.fullName as userName,
        u.email as userEmail
      FROM deal_redemptions dr
      LEFT JOIN users u ON dr.user_id = u.id
      WHERE dr.deal_id = ?
      ORDER BY dr.redeemed_at DESC
    `;

    const redemptions = await queryAsync(query, [dealId]);

    res.json({
      success: true,
      redemptions
    });
  } catch (err) {
    console.error('Error fetching deal redemptions:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching deal redemptions',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

router.delete('/deals/:id', auth, admin, async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);
    if (!dealId || isNaN(dealId)) {
      return res.status(400).json({ success: false, message: 'Valid deal ID is required' });
    }

    if (!(await tableExists('deals'))) {
      return res.status(404).json({ success: false, message: 'Deals table not found' });
    }

    // First delete related deal_redemptions (if any)
    if (await tableExists('deal_redemptions')) {
      await queryAsync('DELETE FROM deal_redemptions WHERE deal_id = ?', [dealId]);
    }

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

// Deal approval by admin
router.patch('/deals/:id/approve', auth, admin, async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);
    if (!dealId || isNaN(dealId)) {
      return res.status(400).json({ success: false, message: 'Valid deal ID is required' });
    }

    if (!(await tableExists('deals'))) {
      return res.status(404).json({ success: false, message: 'Deals table not found' });
    }

    // Check if deal exists and is pending
    const existingDeal = await queryAsync('SELECT id, status, businessId FROM deals WHERE id = ?', [dealId]);
    if (existingDeal.length === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    if (existingDeal[0].status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'Deal is not pending approval' });
    }

    // Update deal status to active
    await queryAsync('UPDATE deals SET status = ? WHERE id = ?', ['active', dealId]);

    // TODO: Send notification to merchant about deal approval
    // For now, we'll add a basic notification entry if notifications table exists
    if (await tableExists('notifications')) {
      try {
        await queryAsync(
          'INSERT INTO notifications (userId, type, title, message, relatedId, created_at) VALUES ((SELECT userId FROM businesses WHERE businessId = ?), ?, ?, ?, ?, NOW())',
          [existingDeal[0].businessId, 'deal_approved', 'Deal Approved', 'Your deal has been approved and is now active.', dealId]
        );
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError);
      }
    }

    res.json({
      success: true,
      message: 'Deal approved successfully'
    });
  } catch (err) {
    console.error('Error approving deal:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error approving deal',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Deal rejection by admin
router.patch('/deals/:id/reject', auth, admin, async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);
    const { reason } = req.body;
    
    if (!dealId || isNaN(dealId)) {
      return res.status(400).json({ success: false, message: 'Valid deal ID is required' });
    }

    if (!(await tableExists('deals'))) {
      return res.status(404).json({ success: false, message: 'Deals table not found' });
    }

    // Check if deal exists and is pending
    const existingDeal = await queryAsync('SELECT id, status, businessId FROM deals WHERE id = ?', [dealId]);
    if (existingDeal.length === 0) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    if (existingDeal[0].status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'Deal is not pending approval' });
    }

    // Update deal status to rejected
    await queryAsync('UPDATE deals SET status = ? WHERE id = ?', ['rejected', dealId]);

    // TODO: Send notification to merchant about deal rejection
    // For now, we'll add a basic notification entry if notifications table exists
    if (await tableExists('notifications')) {
      try {
        const message = reason ? `Your deal has been rejected. Reason: ${reason}` : 'Your deal has been rejected.';
        await queryAsync(
          'INSERT INTO notifications (userId, type, title, message, relatedId, created_at) VALUES ((SELECT userId FROM businesses WHERE businessId = ?), ?, ?, ?, ?, NOW())',
          [existingDeal[0].businessId, 'deal_rejected', 'Deal Rejected', message, dealId]
        );
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError);
      }
    }

    res.json({
      success: true,
      message: 'Deal rejected successfully'
    });
  } catch (err) {
    console.error('Error rejecting deal:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error rejecting deal',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// ===== SETTINGS MANAGEMENT =====
// Public settings endpoint for frontend
// Public settings endpoint for frontend
router.get('/settings/public', async (req, res) => {
  try {
    let settings = {
      socialMediaRequirements: {},
      membershipPlanRequirements: {},
      features: {
        show_social_media_home: false,
        show_statistics: true,
        business_directory: true,
        showMembershipPlans: true
      },
      content: {
        terms_conditions: 'By using this service, you agree to abide by all rules and regulations set forth by the Indians in Ghana community. Membership benefits are subject to change without prior notice.'
      }
    };

    console.log('📱 Loading public settings...');

    // Try to load from database if settings table exists
    if (await tableExists('settings')) {
      try {
        const dbSettings = await queryAsync('SELECT * FROM settings');
        console.log('🔍 Database settings found:', dbSettings.length);
        
        if (dbSettings.length > 0) {
          // Parse social media requirements
          const socialMediaRows = dbSettings.filter(s => s.section === 'socialMediaRequirements');
          if (socialMediaRows.length > 0) {
            settings.socialMediaRequirements = {};
            socialMediaRows.forEach(row => {
              const key = row.key.replace('socialMediaRequirements.', '');
              try {
                settings.socialMediaRequirements[key] = JSON.parse(row.value);
              } catch (e) {
                settings.socialMediaRequirements[key] = row.value;
              }
            });
            console.log('✅ Social media settings loaded:', Object.keys(settings.socialMediaRequirements));
          }

          // Parse membership plan requirements
          const membershipPlanRows = dbSettings.filter(s => s.section === 'membershipPlanRequirements');
          if (membershipPlanRows.length > 0) {
            settings.membershipPlanRequirements = {};
            membershipPlanRows.forEach(row => {
              const key = row.key.replace('membershipPlanRequirements.', '');
              try {
                settings.membershipPlanRequirements[key] = JSON.parse(row.value);
              } catch (e) {
                settings.membershipPlanRequirements[key] = row.value;
              }
            });
            console.log('✅ Membership plan settings loaded:', Object.keys(settings.membershipPlanRequirements));
          }

          // Parse feature toggles
          const featureRows = dbSettings.filter(s => s.section === 'featureToggles');
          featureRows.forEach(row => {
            const key = row.key.replace('featureToggles.', '');
            const isOn = row.value === 'true';
            
            switch (key) {
              case 'showSocialMediaHome':
              case 'show_social_media_home':
                settings.features.show_social_media_home = isOn;
                break;
              case 'showStatistics':
              case 'show_statistics':
                settings.features.show_statistics = isOn;
                break;
              case 'businessDirectory':
              case 'business_directory':
                settings.features.business_directory = isOn;
                break;
              case 'showMembershipPlans':
              case 'show_membership_plans':
                settings.features.showMembershipPlans = isOn;
                break;
              default:
                break;
            }
          });

          // Parse content
          const contentRows = dbSettings.filter(s => s.section === 'content');
          contentRows.forEach(row => {
            const key = row.key.replace('content.', '');
            settings.content[key] = row.value;
          });
        }
      } catch (settingsError) {
        console.warn('Error loading settings from database:', settingsError);
      }
    }

    console.log('📤 Sending public settings:', {
      hasSocialMedia: Object.keys(settings.socialMediaRequirements).length > 0,
      showSocialHome: settings.features.show_social_media_home,
      socialPlatforms: Object.keys(settings.socialMediaRequirements),
      hasMembershipPlans: Object.keys(settings.membershipPlanRequirements).length > 0,
      showMembershipPlans: settings.features.showMembershipPlans,
      membershipPlans: Object.keys(settings.membershipPlanRequirements)
    });

    res.json({
      success: true,
      settings
    });
  } catch (err) {
    console.error('Error fetching public admin settings:', err);
    res.status(500).json({ success: false, message: 'Server error fetching settings' });
  }
});


router.get('/settings', auth, admin, async (req, res) => {
  try {
    // Initialize admin editable settings sections, including toggles and content
    let settings = {
      socialMediaRequirements: {
        facebook: false,
        instagram: false,
        twitter: false,
        linkedin: false,
        youtube: false,
        tiktok: false
      },
      membershipPlanRequirements: {
        section_title: 'Choose Your Membership Plan',
        section_subtitle: 'Select the membership plan that best fits your needs'
      },
      featureToggles: {
        showSocialMediaHome: true,
        showMembershipPlans: true
      },
      content: {
        terms_conditions: ''
      }
    };

    // Try to load from database if settings table exists
    if (await tableExists('settings')) {
      try {
        const dbSettings = await queryAsync('SELECT * FROM settings');
        if (dbSettings.length > 0) {
          // Merge database settings into each section
          dbSettings.forEach(setting => {
            const [section, key] = setting.key.split('.');
            const raw = setting.value;
            if (settings[section] && key) {
              let value;
              if (raw === 'true' || raw === 'false') {
                value = raw === 'true';
              } else {
                // Try to parse JSON objects
                try {
                  if (raw.startsWith('{') || raw.startsWith('[')) {
                    value = JSON.parse(raw);
                  } else {
                    value = raw;
                  }
                } catch (parseError) {
                  // If parsing fails, use the raw value
                  value = raw;
                }
              }
              settings[section][key] = value;
            }
          });
        }
      } catch (settingsError) {
        console.warn('Error loading settings from database:', settingsError);
      }
    }

    res.json({
      success: true,
      ...settings
    });
  } catch (err) {
    console.error('Error fetching admin settings:', err);
    res.status(500).json({ success: false, message: 'Server error fetching settings' });
  }
});

router.put('/settings', auth, admin, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ success: false, message: 'Settings data is required' });
    }

    // If social media section is disabled, clear requirements before saving
    if (settings.featureToggles?.showSocialMediaHome === false || settings.features?.show_social_media_home === false) {
      settings.socialMediaRequirements = {};
    }

    // If membership plans section is disabled, clear requirements before saving
    if (settings.featureToggles?.showMembershipPlans === false || settings.features?.showMembershipPlans === false) {
      settings.membershipPlanRequirements = {};
    }

    // Save to database if settings table exists (preserve dynamicFields section)
    if (await tableExists('settings')) {
      try {
        // Delete only sections being updated (retain dynamicFields)
        const sections = Object.keys(settings).filter(sec => typeof settings[sec] === 'object');
        if (sections.length) {
          const placeholders = sections.map(() => '?').join(',');
          await queryAsync(
            `DELETE FROM settings WHERE section IN (${placeholders})`,
            sections
          );
        }
        // Insert new settings entries
        const insertPromises = [];
        sections.forEach(section => {
          Object.keys(settings[section]).forEach(key => {
            const value = settings[section][key];
            // Properly stringify objects, keep primitives as-is
            const stringValue = typeof value === 'object' && value !== null 
              ? JSON.stringify(value) 
              : value.toString();
            insertPromises.push(
              queryAsync(
                'INSERT INTO settings (`key`, value, section, updated_at) VALUES (?, ?, ?, NOW())',
                [`${section}.${key}`, stringValue, section]
              )
            );
          });
        });
        await Promise.all(insertPromises);
      } catch (settingsError) {
        console.warn('Error saving settings to database:', settingsError);
      }
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    console.error('Error updating admin settings:', err);
    res.status(500).json({ success: false, message: 'Server error updating settings' });
  }
});

// ===== DYNAMIC FIELDS MANAGEMENT =====
// Get dynamic field options
// Get all dynamic fields for frontend
// Get all dynamic fields for frontend
router.get('/dynamic-fields', async (req, res) => {
  try {
    const fieldTypes = ['communities', 'userTypes', 'businessCategories', 'dealCategories'];
    const dynamicFields = {};

    if (await tableExists('settings')) {
      for (const fieldType of fieldTypes) {
        const settingKey = `dynamicFields.${fieldType}`;
        const result = await queryAsync('SELECT value FROM settings WHERE `key` = ?', [settingKey]);
        
        if (result.length > 0) {
          try {
            dynamicFields[fieldType] = JSON.parse(result[0].value);
          } catch (parseError) {
            console.error(`Error parsing ${fieldType} options:`, parseError);
            dynamicFields[fieldType] = getDefaultFieldOptions(fieldType);
          }
        } else {
          dynamicFields[fieldType] = getDefaultFieldOptions(fieldType);
        }
      }
    } else {
      // Return default values if settings table doesn't exist
      fieldTypes.forEach(fieldType => {
        dynamicFields[fieldType] = getDefaultFieldOptions(fieldType);
      });
    }

    res.json({
      success: true,
      dynamicFields
    });
  } catch (err) {
    console.error('Error fetching all dynamic fields:', err);
    res.status(500).json({ success: false, message: 'Server error fetching dynamic fields' });
  }
});

// Update dynamic field options
router.put('/dynamic-fields/:fieldType', auth, admin, async (req, res) => {
  try {
    const { fieldType } = req.params;
    const { options } = req.body;
    const validFieldTypes = ['communities', 'userTypes', 'businessCategories', 'dealCategories'];
    
    if (!validFieldTypes.includes(fieldType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid field type'
      });
    }

    if (!Array.isArray(options)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Options must be an array'
      });
    }

    const settingKey = `dynamicFields.${fieldType}`;
    const optionsJson = JSON.stringify(options);

    if (await tableExists('settings')) {
      await queryAsync(
        'INSERT INTO settings (`key`, value, section, updated_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()',
        [settingKey, optionsJson, 'dynamicFields', optionsJson]
      );
    }

    res.json({ 
      success: true, 
      message: `${fieldType} options updated successfully`,
      [fieldType]: options
    });
  } catch (err) {
    console.error('Error updating dynamic field options:', err);
    res.status(500).json({ success: false, message: 'Server error updating field options' });
  }
});

// Get all dynamic fields for frontend
router.get('/dynamic-fields', async (req, res) => {
  try {
    const fieldTypes = ['communities', 'userTypes', 'businessCategories', 'dealCategories'];
    const dynamicFields = {};

    if (await tableExists('settings')) {
      for (const fieldType of fieldTypes) {
        const settingKey = `dynamicFields.${fieldType}`;
        const result = await queryAsync('SELECT value FROM settings WHERE `key` = ?', [settingKey]);
        
        if (result.length > 0) {
          try {
            dynamicFields[fieldType] = JSON.parse(result[0].value);
          } catch (parseError) {
            console.error(`Error parsing ${fieldType} options:`, parseError);
            dynamicFields[fieldType] = getDefaultFieldOptions(fieldType);
          }
        } else {
          dynamicFields[fieldType] = getDefaultFieldOptions(fieldType);
        }
      }
    } else {
      // Return default values if settings table doesn't exist
      fieldTypes.forEach(fieldType => {
        dynamicFields[fieldType] = getDefaultFieldOptions(fieldType);
      });
    }

    res.json({ 
      success: true, 
      dynamicFields
    });
  } catch (err) {
    console.error('Error fetching all dynamic fields:', err);
    res.status(500).json({ success: false, message: 'Server error fetching dynamic fields' });
  }
});

// Helper function to get default field options
const getDefaultFieldOptions = (fieldType) => {
  switch (fieldType) {
    case 'communities':
      return [
        { name: 'Gujarati', description: 'Gujarati community', isActive: true },
        { name: 'Punjabi', description: 'Punjabi community', isActive: true },
        { name: 'Tamil', description: 'Tamil community', isActive: true },
        { name: 'Bengali', description: 'Bengali community', isActive: true },
        { name: 'Hindi', description: 'Hindi speaking community', isActive: true },
        { name: 'Other Indian', description: 'Other Indian communities', isActive: true }
      ];
    case 'userTypes':
      return [
        { name: 'Professional', description: 'Working professional', isActive: true },
        { name: 'Business Owner', description: 'Business owner or entrepreneur', isActive: true },
        { name: 'Student', description: 'Student', isActive: true },
        { name: 'Other', description: 'Other profession', isActive: true }
      ];
    case 'businessCategories':
      return [
        { name: 'restaurant', label: 'Restaurant & Food', description: 'Restaurants, food services', isActive: true },
        { name: 'retail', label: 'Retail & Shopping', description: 'Retail stores, shopping', isActive: true },
        { name: 'services', label: 'Professional Services', description: 'Consulting, legal, accounting', isActive: true },
        { name: 'other', label: 'Other', description: 'Other business types', isActive: true }
      ];
    case 'dealCategories':
      return [
        { name: 'restaurant', label: 'Restaurant', description: 'Food and dining deals', isActive: true },
        { name: 'retail', label: 'Retail', description: 'Shopping and retail deals', isActive: true },
        { name: 'services', label: 'Services', description: 'Professional and personal services', isActive: true },
        { name: 'other', label: 'Other', description: 'Other categories', isActive: true }
      ];
    default:
      return [];
  }
};

// ===== ANALYTICS ENDPOINTS =====
router.get('/analytics', auth, admin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);

    let analytics = {
      userGrowth: [],
      planDistribution: [],
      dealPerformance: [],
      revenueData: [],
      conversionRates: {
        userToMerchant: 0,
        planUpgrades: 0,
        dealRedemptions: 0
      }
    };

    // User growth over time
    try {
      const userGrowth = await queryAsync(`
        SELECT DATE(createdAt) as date, COUNT(*) as count
        FROM users 
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `, [days]);
      
      analytics.userGrowth = userGrowth.map(row => ({
        date: row.date,
        users: row.count
      }));
    } catch (err) {
      console.warn('Error fetching user growth:', err);
    }

    // Plan distribution
    try {
      const planDist = await queryAsync(`
        SELECT membershipType as plan, COUNT(*) as count
        FROM users 
        WHERE membershipType IS NOT NULL
        GROUP BY membershipType
      `);
      
      analytics.planDistribution = planDist.map(row => ({
        plan: row.plan,
        users: row.count
      }));
    } catch (err) {
      console.warn('Error fetching plan distribution:', err);
    }

    // Deal performance (if deals table exists)
    if (await tableExists('deals')) {
      try {
        const dealPerf = await queryAsync(`
          SELECT status, COUNT(*) as count
          FROM deals 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          GROUP BY status
        `, [days]);
        
        analytics.dealPerformance = dealPerf.map(row => ({
          status: row.status,
          count: row.count
        }));
      } catch (err) {
        console.warn('Error fetching deal performance:', err);
      }
    }

    res.json({ success: true, analytics });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ success: false, message: 'Server error fetching analytics' });
  }
});

// Get plan subscription statistics
router.get('/plans/statistics', async (req, res) => {
  try {
    console.log('Fetching plan subscription statistics...');

    // Get all plans with their current subscriber counts
    const planStats = {};

    // Get user plan statistics
    if (await tableExists('users')) {
      const userPlanStats = await queryAsync(`
        SELECT 
          u.membershipType as planKey,
          COUNT(*) as subscriberCount,
          p.name as planName,
          p.type as planType
        FROM users u
        LEFT JOIN plans p ON u.membershipType = p.key
        WHERE u.userType = 'user' 
        AND u.membershipType IS NOT NULL 
        AND u.membershipType != ''
        AND u.membershipType != 'free'
        GROUP BY u.membershipType, p.name, p.type
      `);

      // Get merchant plan statistics
      const merchantPlanStats = await queryAsync(`
        SELECT 
          u.membershipType as planKey,
          COUNT(*) as subscriberCount,
          p.name as planName,
          p.type as planType
        FROM users u
        LEFT JOIN plans p ON u.membershipType = p.key
        WHERE u.userType = 'merchant' 
        AND u.membershipType IS NOT NULL 
        AND u.membershipType != ''
        AND u.membershipType != 'basic'
        GROUP BY u.membershipType, p.name, p.type
      `);

      // Get all plans to include those with 0 subscribers
      const allPlans = await queryAsync(`
        SELECT \`key\`, name, type FROM plans WHERE isActive = TRUE
      `);

      // Initialize stats for all plans
      allPlans.forEach(plan => {
        planStats[plan.key] = {
          planKey: plan.key,
          planName: plan.name,
          planType: plan.type,
          subscriberCount: 0
        };
      });

      // Update with actual subscriber counts
      [...userPlanStats, ...merchantPlanStats].forEach(stat => {
        if (stat.planKey && planStats[stat.planKey]) {
          planStats[stat.planKey].subscriberCount = stat.subscriberCount;
        }
      });
    }

    // Get summary statistics
    const userPlansCount = Object.values(planStats).filter(p => p.planType === 'user').length;
    const merchantPlansCount = Object.values(planStats).filter(p => p.planType === 'merchant').length;
    const totalUserSubscribers = Object.values(planStats)
      .filter(p => p.planType === 'user')
      .reduce((sum, p) => sum + p.subscriberCount, 0);
    const totalMerchantSubscribers = Object.values(planStats)
      .filter(p => p.planType === 'merchant')
      .reduce((sum, p) => sum + p.subscriberCount, 0);

    const statistics = {
      planStats: Object.values(planStats),
      summary: {
        userPlans: {
          total: userPlansCount,
          totalSubscribers: totalUserSubscribers
        },
        merchantPlans: {
          total: merchantPlansCount,
          totalSubscribers: totalMerchantSubscribers
        }
      }
    };

    console.log('Plan statistics:', statistics);
    res.json({ success: true, statistics });
  } catch (err) {
    console.error('Error fetching plan statistics:', err);
    res.status(500).json({ success: false, message: 'Server error fetching plan statistics' });
  }
});

router.get('/plan-analytics', auth, admin, async (req, res) => {
  try {
    let planAnalytics = {
      planUsage: [],
      upgradeConversions: [],
      upcomingExpiries: { users: 0, merchants: 0 },
      revenueByPlan: [],
      planTrends: []
    };

    // Plan usage statistics
    try {
      const planUsage = await queryAsync(`
        SELECT 
          membershipType as plan,
          userType,
          COUNT(*) as count
        FROM users 
        WHERE membershipType IS NOT NULL
        GROUP BY membershipType, userType
      `);
      
      planAnalytics.planUsage = planUsage.map(row => ({
        plan: row.plan,
        userType: row.userType,
        count: row.count
      }));
    } catch (err) {
      console.warn('Error fetching plan usage:', err);
    }

    // Upcoming expiries
    try {
      const userExpiries = await queryAsync(`
        SELECT COUNT(*) as count
        FROM users 
        WHERE validationDate IS NOT NULL 
        AND validationDate <= DATE_ADD(NOW(), INTERVAL 30 DAY)
        AND userType != 'merchant'
      `);
      
      const merchantExpiries = await queryAsync(`
        SELECT COUNT(*) as count
        FROM users 
        WHERE validationDate IS NOT NULL 
        AND validationDate <= DATE_ADD(NOW(), INTERVAL 30 DAY)
        AND userType = 'merchant'
      `);
      
      planAnalytics.upcomingExpiries = {
        users: userExpiries[0]?.count || 0,
        merchants: merchantExpiries[0]?.count || 0
      };
    } catch (err) {
      console.warn('Error fetching expiries:', err);
    }

    // Plan trends over last 6 months
    try {
      const planTrends = await queryAsync(`
        SELECT 
          DATE_FORMAT(planAssignedAt, '%Y-%m') as month,
          membershipType as plan,
          COUNT(*) as assignments
        FROM users 
        WHERE planAssignedAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        AND planAssignedAt IS NOT NULL
        GROUP BY DATE_FORMAT(planAssignedAt, '%Y-%m'), membershipType
        ORDER BY month ASC
      `);
      
      planAnalytics.planTrends = planTrends.map(row => ({
        month: row.month,
        plan: row.plan,
        assignments: row.assignments
      }));
    } catch (err) {
      console.warn('Error fetching plan trends:', err);
    }

    res.json({ success: true, analytics: planAnalytics });
  } catch (err) {
    console.error('Error fetching plan analytics:', err);
    res.status(500).json({ success: false, message: 'Server error fetching plan analytics' });
  }
});

// ===== PLAN MANAGEMENT ENDPOINTS =====
router.put('/plans/:id', auth, admin, async (req, res) => {
  try {
    const planId = req.params.id;
    const updateData = req.body;

    if (!(await tableExists('plans'))) {
      return res.status(404).json({ success: false, message: 'Plans table not found' });
    }

    const allowedFields = ['name', 'description', 'price', 'currency', 'billingCycle', 'features', 'dealAccess', 'isActive', 'priority', 'maxUsers', 'max_deals_per_month', 'maxRedemptions', 'type'];
    const updates = [];
    const values = [];

    Object.keys(updateData).forEach(field => {
      if (allowedFields.includes(field) && updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(planId);

    const updateQuery = `UPDATE plans SET ${updates.join(', ')} WHERE id = ?`;
    const result = await queryAsync(updateQuery, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({ success: true, message: 'Plan updated successfully' });
  } catch (err) {
    console.error('Error updating plan:', err);
    res.status(500).json({ success: false, message: 'Server error updating plan' });
  }
});

router.post('/plans', auth, admin, async (req, res) => {
  try {
    const planData = req.body;

    if (!(await tableExists('plans'))) {
      return res.status(404).json({ success: false, message: 'Plans table not found' });
    }

    const requiredFields = ['key', 'name', 'type', 'price'];
    const missingFields = requiredFields.filter(field => !planData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    const result = await queryAsync(`
      INSERT INTO plans (
        \`key\`, name, description, price, currency, billingCycle,
        features, dealAccess, type, isActive, priority, maxUsers, max_deals_per_month,
        maxRedemptions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      planData.key,
      planData.name,
      planData.description || '',
      planData.price || 0,
      planData.currency || 'GHS',
      planData.billingCycle || 'monthly',
      planData.features || '',
      planData.dealAccess || '',
      planData.type || 'user',
      planData.isActive !== false,
      planData.priority || 999,
      planData.maxUsers || null,
      planData.max_deals_per_month || null,
      planData.maxRedemptions || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      planId: result.insertId
    });
  } catch (err) {
    console.error('Error creating plan:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'Plan with this key already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Server error creating plan' });
    }
  }
});

router.delete('/plans/:id', auth, admin, async (req, res) => {
  try {
    const planId = req.params.id;

    if (!(await tableExists('plans'))) {
      return res.status(404).json({ success: false, message: 'Plans table not found' });
    }

    // Check if plan is in use
    const planInUse = await queryAsync('SELECT COUNT(*) as count FROM users WHERE membershipType = (SELECT `key` FROM plans WHERE id = ?)', [planId]);
    
    if (planInUse[0]?.count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete plan that is currently assigned to users' 
      });
    }

    const result = await queryAsync('DELETE FROM plans WHERE id = ?', [planId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (err) {
    console.error('Error deleting plan:', err);
    res.status(500).json({ success: false, message: 'Server error deleting plan' });
  }
});

router.post('/plans/seed', auth, admin, async (req, res) => {
  try {
    const { force = false } = req.body;

    if (!(await tableExists('plans'))) {
      return res.status(404).json({ success: false, message: 'Plans table not found' });
    }

    // Check if plans already exist (unless force is true)
    if (!force) {
      const existingPlans = await queryAsync('SELECT COUNT(*) as count FROM plans');
      if (existingPlans[0]?.count > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Plans already exist. Use force=true to recreate.' 
        });
      }
    }

    // Clear existing plans if force is true
    if (force) {
      await queryAsync('DELETE FROM plans');
    }

    // Seed plans
    const seedPlans = [
      // USER PLANS
      {
        key: 'silver',
        name: 'Silver',
        description: 'Access to all basic deals',
        price: 50,
        currency: 'GHS',
        billingCycle: 'yearly',
        features: 'Access to all basic deals,2 deals redeemptions,2-3 curated deals per month,Access to 2-3 business sectors,No flash deals access,No coupons available,No cashback offers,No event benefits,No community updates',
        dealAccess: 'Basic deals access',
        type: 'user',
        priority: 1,
        maxUsers: null,
        max_deals_per_month: null,
        maxRedemptions: 2
      },
      {
        key: 'gold',
        name: 'Gold',
        description: 'Access to gold deals',
        price: 100,
        currency: 'GHS',
        billingCycle: 'yearly',
        features: 'Access to gold deals,10 deals redeemptions,5-7 premium deals per month,Access to 5-7 business sectors,Occasional flash deals,Limited coupons available,5% cashback from select merchants,Basic event benefits,Monthly community updates,Referral bonus program',
        dealAccess: 'Gold + Basic deals',
        type: 'user',
        priority: 2,
        maxUsers: null,
        max_deals_per_month: null,
        maxRedemptions: 10
      },
      {
        key: 'platinum',
        name: 'Platinum',
        description: 'Full access to all deals',
        price: 150,
        currency: 'GHS',
        billingCycle: 'yearly',
        features: 'Full access to all deals,Unlimited premium deals,Unlimited deals redeemptions,Access to all business sectors,Priority access to flash deals,All available coupons,10% cashback from more merchants,VIP event benefits,Weekly community updates,Enhanced referral bonus program',
        dealAccess: 'All deals access',
        type: 'user',
        priority: 3,
        maxUsers: null,
        max_deals_per_month: null,
        maxRedemptions: -1
      },
      // MERCHANT PLANS
      {
        key: 'basic',
        name: 'Basic',
        description: 'Free Forever',
        price: 0,
        currency: 'GHC',
        billingCycle: 'yearly',
        features: 'Basic Business Listing,Up to 2 Images,Social Media Links Setup,Content Writing,Newsletter Features,Facebook Ads,Instagram Ads,WhatsApp Channel Ads,WhatsApp Group Ads,Deals Post (dedicated page),Job Post (dedicated page),Website Ads,On Page Optimization,Google Indexing Support,Regular SEO Updates,Dedicated Account Manager,Promotion Campaigns',
        dealAccess: 'Unlimited deal posting',
        type: 'merchant',
        priority: 1,
        maxUsers: null,
        max_deals_per_month: -1
      },
      {
        key: 'silver_merchant',
        name: 'Silver',
        description: 'Standard Business Plan - Save 50%',
        price: 300,
        originalPrice: 600,
        currency: 'GHC',
        billingCycle: 'yearly',
        features: 'Standard Business Listing,Up to 5 Images,Social Media Links Setup,Basic Content Writing,Newsletter Features,Facebook Ads: 1/Month,Instagram Ads: 1/Month,WhatsApp Channel Ads: 1/Month,WhatsApp Group Ads: 1/Month,1 Deal Post/Month,Job Post Included,Website Ads,Basic On Page Optimization,Basic Google Indexing Support,Half Yearly SEO Updates,Dedicated Account Manager,1 Promotion Campaign/Year',
        dealAccess: '1 deal per month',
        type: 'merchant',
        priority: 2,
        maxUsers: null,
        max_deals_per_month: 1
      },
      {
        key: 'gold_merchant',
        name: 'Gold',
        description: 'Featured Business Plan - Save 50%',
        price: 500,
        originalPrice: 1000,
        currency: 'GHC',
        billingCycle: 'yearly',
        features: 'Featured Business Listing,Up to 8 Images,Social Media Links Setup,Professional Content Writing,Quarterly Newsletter,Facebook Ads: 2/Month,Instagram Ads: 2/Month,WhatsApp Channel Ads: 2/Month,WhatsApp Group Ads: 2/Month,2 Deals Posts/Month,Job Post Included,Inner Page Ads: 2/month,Standard On Page Optimization,Standard Google Indexing Support,Quarterly SEO Updates,Dedicated Account Manager,2 Promotion Campaigns/Year',
        dealAccess: '2 deals per month',
        type: 'merchant',
        priority: 3,
        maxUsers: null,
        max_deals_per_month: 2
      },
      {
        key: 'platinum_merchant',
        name: 'Platinum',
        description: 'Premium Business Plan - Save 50%',
        price: 800,
        originalPrice: 1600,
        currency: 'GHC',
        billingCycle: 'yearly',
        features: 'Featured Business Listing,Up to 10+ Gallery Images,Social Media Links Setup,Professional Content Writing,2 Times Quarterly Newsletter,Facebook Ads: 3/Month,Instagram Ads: 3/Month,WhatsApp Channel Ads: 3/Month,WhatsApp Group Ads: 3/Month,3 Deals Posts/Month,Job Post Included,Inner Page Ads: 3/month + Homepage: 1,Advanced On Page Optimization,Standard Google Indexing Support,Monthly SEO Updates,Dedicated Account Manager,3 Promotion Campaigns/Year',
        dealAccess: '3 deals per month',
        type: 'merchant',
        priority: 4,
        maxUsers: null,
        max_deals_per_month: 3
      },
      {
        key: 'platinum_plus',
        name: 'Platinum Plus',
        description: 'Ultimate Business Plan - Save 50%',
        price: 1000,
        originalPrice: 2000,
        currency: 'GHC',
        billingCycle: 'yearly',
        features: 'Featured Business Listing,Up to 15+ Gallery Images,Social Media Links Setup,Professional Content Writing + Blog,3 Times Quarterly Newsletter,Facebook Ads: 4/Month,Instagram Ads: 4/Month,WhatsApp Channel Ads: 4/Month,WhatsApp Group Ads: 4/Month,4 Deals Posts/Month,Job Post Included,Inner Page Ads: 4/month + Homepage: 1,Comprehensive On Page Optimization,Standard Google Indexing Support,Monthly SEO Updates,Dedicated Account Manager,4 Promotion Campaigns/Year',
        dealAccess: '4 deals per month',
        type: 'merchant',
        priority: 5,
        maxUsers: null,
        max_deals_per_month: 4
      }
    ];

    for (const plan of seedPlans) {
      await queryAsync(`
        INSERT INTO plans (
          \`key\`, name, description, price, currency, billingCycle,
          features, dealAccess, type, isActive, priority, maxUsers, max_deals_per_month,
          maxRedemptions, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        plan.key, plan.name, plan.description, plan.price, plan.currency,
        plan.billingCycle, plan.features, plan.dealAccess, plan.type,
        true, plan.priority, plan.maxUsers, plan.max_deals_per_month,
        plan.maxRedemptions
      ]);
    }

    res.json({ 
      success: true, 
      message: `Successfully seeded ${seedPlans.length} plans`,
      count: seedPlans.length
    });
  } catch (err) {
    console.error('Error seeding plans:', err);
    res.status(500).json({ success: false, message: 'Server error seeding plans' });
  }
});

// ===== DEAL APPROVAL ENDPOINTS =====

// Get pending deals for approval
router.get('/deals/pending', auth, admin, async (req, res) => {
  try {
    const pendingDeals = await queryAsync(`
      SELECT d.*, b.businessName, u.fullName as merchantName, u.email as merchantEmail
      FROM deals d
      LEFT JOIN businesses b ON d.businessId = b.businessId
      LEFT JOIN users u ON b.userId = u.id
      WHERE d.status = 'pending_approval'
      ORDER BY d.created_at DESC
    `);

    res.json({
      success: true,
      deals: pendingDeals,
      count: pendingDeals.length
    });
  } catch (err) {
    console.error('Error fetching pending deals:', err);
    res.status(500).json({ success: false, message: 'Server error fetching pending deals' });
  }
});

// Get all deals with status filter
router.get('/deals', auth, admin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params = [];
    
    if (status) {
      whereClause = 'WHERE d.status = ?';
      params.push(status);
    }
    
    const deals = await queryAsync(`
      SELECT d.*, b.businessName, u.fullName as merchantName, u.email as merchantEmail
      FROM deals d
      LEFT JOIN businesses b ON d.businessId = b.businessId
      LEFT JOIN users u ON b.userId = u.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get total count
    const countResult = await queryAsync(`
      SELECT COUNT(*) as total
      FROM deals d
      ${whereClause}
    `, params);

    res.json({
      success: true,
      deals: deals,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ success: false, message: 'Server error fetching deals' });
  }
});

// Get live plans for dynamic access level dropdown
router.get('/plans/active', auth, admin, async (req, res) => {
  try {
    if (!(await tableExists('plans'))) {
      return res.status(404).json({ success: false, message: 'Plans table not found' });
    }

    const plans = await queryAsync(`
      SELECT id, name, \`key\`, priority, dealAccess, type, isActive 
      FROM plans 
      WHERE isActive = 1 
      ORDER BY priority ASC, name ASC
    `);

    res.json({ 
      success: true, 
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        key: plan.key,
        priority: plan.priority,
        dealAccess: plan.dealAccess,
        type: plan.type
      }))
    });
  } catch (err) {
    console.error('Error fetching active plans:', err);
    res.status(500).json({ success: false, message: 'Server error fetching active plans' });
  }
});

// Approve deal
router.patch('/deals/:id/approve', auth, admin, async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);
    const { accessLevel, minPlanPriority } = req.body;
    
    if (!dealId || isNaN(dealId)) {
      return res.status(400).json({ success: false, message: 'Valid deal ID is required' });
    }

    // Prepare update query - include accessLevel and/or minPlanPriority if provided
    let updateQuery = 'UPDATE deals SET status = "active", updated_at = NOW()';
    let updateParams = [];
    let finalAccessLevel = null;
    let finalMinPlanPriority = null;
    
    // If minPlanPriority is provided, use it (priority-based access)
    if (minPlanPriority !== undefined && minPlanPriority !== null) {
      const priority = parseInt(minPlanPriority);
      if (!isNaN(priority) && priority >= 0) {
        updateQuery += ', minPlanPriority = ?, requiredPlanPriority = ?';
        updateParams.push(priority, priority);
        finalMinPlanPriority = priority;
        
        // Convert priority to accessLevel dynamically using database plans
        try {
          const plansQuery = 'SELECT * FROM plans WHERE type = "user" AND isActive = 1 ORDER BY priority';
          const plansResult = await queryAsync(plansQuery);
          
          if (plansResult.length > 0) {
            // Find the plan that matches this priority
            const matchingPlan = plansResult.find(plan => plan.priority === priority);
            
            if (matchingPlan) {
              // Use dynamic access level based on plan name/key
              if (matchingPlan.key === 'platinum' || matchingPlan.name.toLowerCase().includes('platinum')) {
                finalAccessLevel = 'all'; // Highest tier can access all
              } else if (matchingPlan.key === 'gold' || matchingPlan.name.toLowerCase().includes('gold')) {
                finalAccessLevel = 'premium';
              } else if (matchingPlan.key === 'silver' || matchingPlan.name.toLowerCase().includes('silver')) {
                finalAccessLevel = 'intermediate';
              } else {
                finalAccessLevel = 'basic';
              }
            } else {
              // Fallback: use position in priority order for dynamic assignment
              const sortedPlans = plansResult.sort((a, b) => b.priority - a.priority);
              const planIndex = sortedPlans.findIndex(plan => plan.priority <= priority);
              
              if (planIndex === 0) finalAccessLevel = 'all'; // Highest priority
              else if (planIndex === 1) finalAccessLevel = 'premium';
              else if (planIndex === 2) finalAccessLevel = 'intermediate';
              else finalAccessLevel = 'basic';
            }
          } else {
            // Fallback to basic if no plans found
            finalAccessLevel = 'basic';
          }
        } catch (planError) {
          console.warn('Could not load plans for dynamic access level conversion:', planError);
          // Fallback to static conversion if dynamic fails
          if (priority >= 3) finalAccessLevel = 'all';
          else if (priority === 2) finalAccessLevel = 'premium';
          else if (priority === 1) finalAccessLevel = 'intermediate';
          else finalAccessLevel = 'basic';
        }
        
        updateQuery += ', accessLevel = ?';
        updateParams.push(finalAccessLevel);
      }
    }
    
    // Legacy accessLevel support (kept for backward compatibility)
    if (accessLevel && ['basic', 'intermediate', 'premium', 'all'].includes(accessLevel)) {
      if (!finalAccessLevel) { // Only use if not already set by minPlanPriority
        updateQuery += ', accessLevel = ?';
        updateParams.push(accessLevel);
        finalAccessLevel = accessLevel;
      }
    }
    
    updateQuery += ' WHERE id = ? AND status = "pending_approval"';
    updateParams.push(dealId);

    console.log('Executing deal approval query:', updateQuery);
    console.log('With parameters:', updateParams);

    const result = await queryAsync(updateQuery, updateParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pending deal not found' });
    }

    // Verify the update by fetching the updated deal
    const verifyQuery = 'SELECT id, status, accessLevel, minPlanPriority FROM deals WHERE id = ?';
    const verifyResult = await queryAsync(verifyQuery, [dealId]);
    
    console.log('Updated deal verification:', verifyResult[0]);

    let approvalMessage = 'Deal approved successfully';
    if (finalMinPlanPriority !== null) {
      approvalMessage += ` with minimum plan priority ${finalMinPlanPriority}`;
    } else if (finalAccessLevel) {
      approvalMessage += ` with access level set to ${finalAccessLevel}`;
    }

    res.json({ 
      success: true, 
      message: approvalMessage,
      accessLevel: finalAccessLevel,
      minPlanPriority: finalMinPlanPriority,
      updatedDeal: verifyResult[0]
    });
  } catch (err) {
    console.error('Error approving deal:', err);
    res.status(500).json({ success: false, message: 'Server error approving deal' });
  }
});

// Reject deal
router.patch('/deals/:id/reject', auth, admin, async (req, res) => {
  try {
    const dealId = parseInt(req.params.id);
    const { rejectionReason } = req.body;
    
    if (!dealId || isNaN(dealId)) {
      return res.status(400).json({ success: false, message: 'Valid deal ID is required' });
    }

    if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const result = await queryAsync(
      'UPDATE deals SET status = "rejected", rejection_reason = ?, updated_at = NOW() WHERE id = ? AND status = "pending_approval"',
      [rejectionReason.trim(), dealId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pending deal not found' });
    }

    res.json({ success: true, message: 'Deal rejected successfully', rejectionReason: rejectionReason.trim() });
  } catch (err) {
    console.error('Error rejecting deal:', err);
    res.status(500).json({ success: false, message: 'Server error rejecting deal' });
  }
});

// Batch approve deals
router.post('/deals/batch-approve', auth, admin, async (req, res) => {
  try {
    const { dealIds } = req.body;
    
    if (!Array.isArray(dealIds) || dealIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Deal IDs array is required' });
    }

    const placeholders = dealIds.map(() => '?').join(',');
    const result = await queryAsync(
      `UPDATE deals SET status = "active", updated_at = NOW() WHERE id IN (${placeholders}) AND status = "pending_approval"`,
      dealIds
    );

    res.json({ 
      success: true, 
      message: `${result.affectedRows} deals approved successfully`,
      approved: result.affectedRows
    });
  } catch (err) {
    console.error('Error batch approving deals:', err);
    res.status(500).json({ success: false, message: 'Server error batch approving deals' });
  }
});

// Batch reject deals
router.post('/deals/batch-reject', auth, admin, async (req, res) => {
  try {
    const { dealIds, rejectionReason } = req.body;
    
    if (!Array.isArray(dealIds) || dealIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Deal IDs array is required' });
    }

    if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required for batch rejection' });
    }

    const placeholders = dealIds.map(() => '?').join(',');
    const result = await queryAsync(
      `UPDATE deals SET status = "rejected", rejection_reason = ?, updated_at = NOW() WHERE id IN (${placeholders}) AND status = "pending_approval"`,
      [rejectionReason.trim(), ...dealIds]
    );

    res.json({ 
      success: true, 
      message: `${result.affectedRows} deals rejected successfully`,
      rejected: result.affectedRows,
      rejectionReason: rejectionReason.trim()
    });
  } catch (err) {
    console.error('Error batch rejecting deals:', err);
    res.status(500).json({ success: false, message: 'Server error batch rejecting deals' });
  }
});

// ===== DATABASE SCHEMA MANAGEMENT =====

// Fix deals status enum (admin only)
router.post('/fix-deals-status-enum', auth, admin, async (req, res) => {
  try {
    console.log('Admin requested deals status enum fix...');
    
    // First check current enum
    const currentSchema = await queryAsync("SHOW COLUMNS FROM deals WHERE Field = 'status'");
    console.log('Current status enum:', currentSchema[0]?.Type);
    
    // Update the enum to include pending_approval and rejected
    const updateQuery = `
      ALTER TABLE deals 
      MODIFY COLUMN status ENUM('active', 'inactive', 'expired', 'scheduled', 'pending_approval', 'rejected') 
      DEFAULT 'pending_approval'
    `;
    
    await queryAsync(updateQuery);
    
    // Verify the change
    const updatedSchema = await queryAsync("SHOW COLUMNS FROM deals WHERE Field = 'status'");
    console.log('Updated status enum:', updatedSchema[0]?.Type);
    
    res.json({
      success: true,
      message: 'Deals status enum updated successfully',
      before: currentSchema[0]?.Type,
      after: updatedSchema[0]?.Type
    });
    
  } catch (err) {
    console.error('Error fixing deals status enum:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fixing status enum',
      error: err.message 
    });
  }
});

// @route   POST /api/admin/test/expire-plan/:userId
// @desc    Test endpoint to simulate plan expiry (sets validationDate to yesterday)
// @access  Private (Admin only)
router.post('/test/expire-plan/:userId', admin, async (req, res) => {
  try {
    const { userId } = req.params;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Update user's validationDate to yesterday to simulate expiry
    const result = await queryAsync(
      'UPDATE users SET validationDate = ? WHERE id = ?',
      [yesterday, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get updated user info
    const userResult = await queryAsync(
      'SELECT id, fullName, email, membershipType, validationDate FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Plan expiry simulated successfully',
      user: userResult[0],
      testInfo: {
        originalValidationDate: 'Set to yesterday',
        expiryDate: yesterday.toISOString(),
        note: 'User plan is now expired for testing purposes'
      }
    });

  } catch (err) {
    console.error('Error simulating plan expiry:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error simulating plan expiry',
      error: err.message 
    });
  }
});

// @route   POST /api/admin/test/restore-plan/:userId
// @desc    Test endpoint to restore plan (sets validationDate to next year)
// @access  Private (Admin only)
router.post('/test/restore-plan/:userId', admin, async (req, res) => {
  try {
    const { userId } = req.params;
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    // Update user's validationDate to next year to restore access
    const result = await queryAsync(
      'UPDATE users SET validationDate = ? WHERE id = ?',
      [nextYear, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get updated user info
    const userResult = await queryAsync(
      'SELECT id, fullName, email, membershipType, validationDate FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Plan access restored successfully',
      user: userResult[0],
      testInfo: {
        newValidationDate: nextYear.toISOString(),
        note: 'User plan is now active for testing purposes'
      }
    });

  } catch (err) {
    console.error('Error restoring plan access:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error restoring plan access',
      error: err.message 
    });
  }
});

module.exports = router;

