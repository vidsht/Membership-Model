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

// Export partners (CSV) - placed before /partners/:id so 'export' is not treated as an :id
router.get('/partners/export', auth, admin, async (req, res) => {
  try {
    const { status, category, search, dateFrom, dateTo } = req.query;

    let whereClause = 'WHERE u.userType = "merchant"';
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    if (category && category !== 'all') {
      whereClause += ' AND b.businessCategory = ?';
      params.push(category);
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

    const businessTableExists = await tableExists('businesses');

    let exportQuery;
    if (businessTableExists) {
      exportQuery = `
        SELECT 
          u.id, u.fullName, u.email, u.phone, u.address, u.community, u.membershipType,
          u.status, u.createdAt, u.lastLogin,
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
      `;
    } else {
      exportQuery = `
        SELECT 
          u.id, u.fullName, u.email, u.phone, u.address, u.community, u.membershipType,
          u.status, u.createdAt, u.lastLogin,
          NULL as businessId, NULL as businessName, NULL as businessDescription,
          NULL as businessCategory, NULL as businessAddress, NULL as businessPhone,
          NULL as businessEmail, NULL as website, NULL as businessLicense, NULL as taxId,
          NULL as customDealLimit,
          p.name as planName, p.price as planPrice, p.billingCycle, p.currency, p.features,
          p.max_deals_per_month as planMaxDeals
        FROM users u
        LEFT JOIN plans p ON u.membershipType = p.key
        ${whereClause}
        ORDER BY u.createdAt DESC
      `;
    }

    const merchants = await queryAsync(exportQuery, params);

    const csvSafe = (val) => {
      if (val === null || val === undefined) return '';
      const s = typeof val === 'string' ? val : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '';

    const headers = [
      'Merchant ID','Owner Name','Owner Email','Owner Phone','Owner Address','Community','Membership Type',
      'Status','Registration Date','Last Login','Business ID','Business Name','Business Description','Business Category',
      'Business Address','Business Phone','Business Email','Website','Business License','Tax ID','Custom Deal Limit',
      'Plan Name','Plan Price','Billing Cycle','Currency','Plan Max Deals'
    ];

    const csvRows = [headers.join(',')];

    merchants.forEach(m => {
      const row = [
        m.id || '',
        csvSafe(m.fullName || ''),
        m.email || '',
        m.phone || '',
        csvSafe(m.address || ''),
        m.community || '',
        m.membershipType || '',
        m.status || '',
        fmtDate(m.createdAt),
        fmtDate(m.lastLogin),
        m.businessId || '',
        csvSafe(m.businessName || ''),
        csvSafe(m.businessDescription || ''),
        m.businessCategory || '',
        csvSafe(m.businessAddress || ''),
        m.businessPhone || '',
        m.businessEmail || '',
        m.website || '',
        m.businessLicense || '',
        m.taxId || '',
        m.customDealLimit || '',
        m.planName || '',
        m.planPrice || '',
        m.billingCycle || '',
        m.currency || '',
        m.planMaxDeals || ''
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=merchants-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting partners:', err);
    res.status(500).json({ success: false, message: 'Server error exporting partners' });
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

// Export partners (CSV) - placed before /partners/:id so 'export' is not treated as an :id
router.get('/partners/export', auth, admin, async (req, res) => {
  try {
    const { status, category, search, dateFrom, dateTo } = req.query;

    let whereClause = 'WHERE u.userType = "merchant"';
    const params = [];

    if (status && status !== 'all') {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    if (category && category !== 'all') {
      whereClause += ' AND b.businessCategory = ?';
      params.push(category);
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

    const businessTableExists = await tableExists('businesses');

    let exportQuery;
    if (businessTableExists) {
      exportQuery = `
        SELECT 
          u.id, u.fullName, u.email, u.phone, u.address, u.community, u.membershipType,
          u.status, u.createdAt, u.lastLogin,
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
      `;
    } else {
      exportQuery = `
        SELECT 
          u.id, u.fullName, u.email, u.phone, u.address, u.community, u.membershipType,
          u.status, u.createdAt, u.lastLogin,
          NULL as businessId, NULL as businessName, NULL as businessDescription,
          NULL as businessCategory, NULL as businessAddress, NULL as businessPhone,
          NULL as businessEmail, NULL as website, NULL as businessLicense, NULL as taxId,
          NULL as customDealLimit,
          p.name as planName, p.price as planPrice, p.billingCycle, p.currency, p.features,
          p.max_deals_per_month as planMaxDeals
        FROM users u
        LEFT JOIN plans p ON u.membershipType = p.key
        ${whereClause}
        ORDER BY u.createdAt DESC
      `;
    }

    const merchants = await queryAsync(exportQuery, params);

    const csvSafe = (val) => {
      if (val === null || val === undefined) return '';
      const s = typeof val === 'string' ? val : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '';

    const headers = [
      'Merchant ID','Owner Name','Owner Email','Owner Phone','Owner Address','Community','Membership Type',
      'Status','Registration Date','Last Login','Business ID','Business Name','Business Description','Business Category',
      'Business Address','Business Phone','Business Email','Website','Business License','Tax ID','Custom Deal Limit',
      'Plan Name','Plan Price','Billing Cycle','Currency','Plan Max Deals'
    ];

    const csvRows = [headers.join(',')];

    merchants.forEach(m => {
      const row = [
        m.id || '',
        csvSafe(m.fullName || ''),
        m.email || '',
        m.phone || '',
        csvSafe(m.address || ''),
        m.community || '',
        m.membershipType || '',
        m.status || '',
        fmtDate(m.createdAt),
        fmtDate(m.lastLogin),
        m.businessId || '',
        csvSafe(m.businessName || ''),
        csvSafe(m.businessDescription || ''),
        m.businessCategory || '',
        csvSafe(m.businessAddress || ''),
        m.businessPhone || '',
        m.businessEmail || '',
        m.website || '',
        m.businessLicense || '',
        m.taxId || '',
        m.customDealLimit || '',
        m.planName || '',
        m.planPrice || '',
        m.billingCycle || '',
        m.currency || '',
        m.planMaxDeals || ''
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=merchants-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting partners:', err);
    res.status(500).json({ success: false, message: 'Server error exporting partners' });
  }
});

module.exports = router;