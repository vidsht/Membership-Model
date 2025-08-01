
// Admin routes - MySQL only implementation
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { auth, admin } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

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
    const [planRows] = await db.promise().query('SELECT `key` FROM plans WHERE id = ?', [planId]);
    if (!planRows.length) {
      return res.status(404).json({ success: false, message: 'Plan not found.' });
    }
    const planKey = planRows[0].key;
    // Update user with new plan
    const [result] = await db.promise().query(
      'UPDATE users SET membershipType = ?, planAssignedAt = NOW(), planAssignedBy = ? WHERE id = ?',
      [planKey, req.user.id || null, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    // Return updated user
    const [userRows] = await db.promise().query(
      'SELECT id, fullName, email, membershipType, planAssignedAt, planAssignedBy FROM users WHERE id = ?',
      [userId]
    );
    return res.json({ success: true, user: userRows[0] });
  } catch (err) {
    console.error('Error assigning plan to user:', err);
    return res.status(500).json({ success: false, message: 'Server error assigning plan.' });
  }
});

// @route   GET /api/admin/stats
// @desc    Get admin dashboard stats
// @access  Private (Admin only)
router.get('/stats', auth, admin, async (req, res) => {
  try {
    db.query('SELECT * FROM plans', async (err, plans) => {
      if (err) {
        console.error('Error fetching plans:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      const userPlanKeys = plans.filter(p => p.type === 'user').map(p => p.key);
      const merchantPlanKeys = plans.filter(p => p.type === 'merchant').map(p => p.key);

      const userPlanCounts = {};
      for (const key of userPlanKeys) {
        const [rows] = await db.promise().query(
          'SELECT COUNT(*) AS count FROM users WHERE membershipType = ? AND userType != "merchant"', [key]
        );
        userPlanCounts[key] = rows[0].count;
      }
      const merchantPlanCounts = {};
      for (const key of merchantPlanKeys) {
        const [rows] = await db.promise().query(
          'SELECT COUNT(*) AS count FROM users WHERE membershipType = ? AND userType = "merchant"', [key]
        );
        merchantPlanCounts[key] = rows[0].count;
      }
      const [[{ count: totalUsers }]] = await db.promise().query('SELECT COUNT(*) AS count FROM users WHERE userType != "merchant"');
      const [[{ count: totalMerchants }]] = await db.promise().query('SELECT COUNT(*) AS count FROM users WHERE userType = "merchant"');
      const [[{ count: pendingApprovals }]] = await db.promise().query('SELECT COUNT(*) AS count FROM users WHERE status = "pending"');
      const [[{ count: activeBusinesses }]] = await db.promise().query('SELECT COUNT(*) AS count FROM users WHERE userType = "merchant" AND status = "approved"');
      const totalRevenue = 0; // Placeholder for now
      const stats = {
        totalUsers,
        totalMerchants,
        pendingApprovals,
        activeBusinesses,
        totalRevenue,
        userPlanCounts,
        merchantPlanCounts,
        planKeys: plans.map(p => ({ key: p.key, name: p.name, type: p.type }))
      };
      res.json(stats);
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/activities
// @desc    Get recent admin activities
// @access  Private (Admin only)
router.get('/activities', auth, admin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const dateRange = parseInt(req.query.dateRange) || 30; // days
    
    // Calculate date filter
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);
    
    // Generate activities from various sources
    const activities = [];
    
    // Recent user registrations
    const recentUsers = await User.find({
      createdAt: { $gte: startDate },
      userType: { $nin: ['admin'] }
    })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 20))
    .select('fullName email userType createdAt businessInfo');
    
    recentUsers.forEach(user => {
      activities.push({
        id: `user_${user._id}`,
        type: user.userType === 'merchant' ? 'business_registered' : 'user_registered',
        title: user.userType === 'merchant' ? 'New Business Registration' : 'New User Registration',
        description: user.userType === 'merchant' 
          ? `${user.businessInfo?.businessName || 'A business'} registered as a business partner`
          : `${user.fullName} joined as a ${user.userType}`,
        user: {
          name: user.fullName,
          email: user.email,
          type: user.userType
        },
        timestamp: user.createdAt,
        icon: user.userType === 'merchant' ? 'store' : 'user-plus'
      });
    });
    
    // Recent plan assignments (if plan assignment tracking exists)
    const recentPlanAssignments = await User.find({
      planAssignedAt: { $gte: startDate, $exists: true }
    })
    .sort({ planAssignedAt: -1 })
    .limit(Math.min(limit, 10))
    .select('fullName email membershipType planAssignedAt userType');
    
    recentPlanAssignments.forEach(user => {
      activities.push({
        id: `plan_${user._id}`,
        type: 'plan_assigned',
        title: 'Plan Assignment',
        description: `${user.fullName} was assigned to ${user.membershipType} plan`,
        user: {
          name: user.fullName,
          email: user.email,
          type: user.userType
        },
        timestamp: user.planAssignedAt,
        icon: 'id-card'
      });
    });
    
    // Sort all activities by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, limit);
    
    res.json({
      activities: limitedActivities,
      total: activities.length,
      dateRange: dateRange,
      limit: limit
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Private (Admin only)
router.get('/users', auth, admin, async (req, res) => {
  try {    // Parse query parameters for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || 'all';
    const plan = req.query.plan || 'all';
    const search = req.query.search || '';
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const userType = req.query.userType || 'user'; // Default to 'user' type only    // Build filter object
    let filter = {};
    
    // Filter by userType - default to 'user' to exclude merchants and admins
    if (userType === 'user') {
      filter.userType = { $nin: ['admin', 'merchant'] };
    } else if (userType === 'merchant') {
      filter.userType = 'merchant';
    } else if (userType === 'admin') {
      filter.userType = 'admin';
    } else {
      // If userType is 'all' or any other value, show all users
      // But typically we want to exclude admins from general user lists
      filter.userType = { $nin: ['admin'] };
    }
    
    if (status !== 'all') {
      filter.status = status;
    }
    
    if (plan !== 'all') {
      filter.membershipType = plan;
    }
    
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
      // Keep the userType filter even when searching to maintain exclusion
    }
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Get users with pagination
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    
    res.json({
      users,
      totalUsers,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      pageSize: limit
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });  }
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
      userType,
      membershipType,
      address
    } = req.body;

    // Validate required fields
    if (!fullName || !email) {
      return res.status(400).json({ 
        message: 'Please provide all required fields: fullName, email' 
      });
    }

    // Check if user with email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'A user with this email already exists' 
      });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create the new user
    const newUser = new User({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      userType: userType || 'user', // Changed from 'member' to 'user'
      membershipType: membershipType || 'community',
      status: 'approved', // Admin-created users are pre-approved
      address: address || {},
      joinDate: new Date(),
      isActive: true
    });

    await newUser.save();

    // TODO: Send welcome email with temporary password
    // This would typically be done via email service

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        userType: newUser.userType,
        membershipType: newUser.membershipType,
        status: newUser.status,
        joinDate: newUser.joinDate
      },
      temporaryPassword: tempPassword // In production, this should be sent via email
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users/:id/approve
// @desc    Approve user registration
// @access  Private (Admin only)
router.post('/users/:id/approve', auth, admin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User approved successfully', user });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users/:id/reject
// @desc    Reject user registration
// @access  Private (Admin only)
router.post('/users/:id/reject', auth, admin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User rejected successfully', user });  } catch (error) {
    console.error('Error rejecting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users/:id/suspend
// @desc    Suspend user account
// @access  Private (Admin only)
router.post('/users/:id/suspend', auth, admin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended' },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User suspended successfully', user });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users/:id/activate
// @desc    Activate suspended user account
// @access  Private (Admin only)
router.post('/users/:id/activate', auth, admin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User activated successfully', user });
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users/bulk-action
// @desc    Perform bulk actions on users
// @access  Private (Admin only)
router.post('/users/bulk-action', auth, admin, async (req, res) => {
  try {
    const { userIds, action } = req.body;
    
    if (!userIds || !action || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'Invalid request data' });
    }
      let updateData = {};
    switch (action) {
      case 'approve':
        updateData = { status: 'approved' };
        break;
      case 'reject':
        updateData = { status: 'rejected' };
        break;
      case 'suspend':
        updateData = { status: 'suspended' };
        break;
      case 'activate':
        updateData = { status: 'approved' };
        break;
      case 'delete':
        await User.deleteMany({ _id: { $in: userIds } });
        return res.json({ message: `${userIds.length} users deleted successfully` });
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      updateData
    );
    
    res.json({ 
      message: `${result.modifiedCount} users ${action}d successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users/bulk-approve
// @desc    Bulk approve users
// @access  Private (Admin only)
router.post('/users/bulk-approve', auth, admin, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'Invalid request data' });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { status: 'approved' }
    );
    
    res.json({ 
      message: `${result.modifiedCount} users approved successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk approving users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users/bulk-reject
// @desc    Bulk reject users
// @access  Private (Admin only)
router.post('/users/bulk-reject', auth, admin, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'Invalid request data' });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { status: 'rejected' }
    );
    
    res.json({ 
      message: `${result.modifiedCount} users rejected successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk rejecting users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users/bulk-suspend
// @desc    Bulk suspend users
// @access  Private (Admin only)
router.post('/users/bulk-suspend', auth, admin, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'Invalid request data' });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { status: 'suspended' }
    );
    
    res.json({ 
      message: `${result.modifiedCount} users suspended successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk suspending users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users/bulk-activate
// @desc    Bulk activate users
// @access  Private (Admin only)
router.post('/users/bulk-activate', auth, admin, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'Invalid request data' });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { status: 'approved' }
    );
    
    res.json({ 
      message: `${result.modifiedCount} users activated successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk activating users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get single user by ID
// @access  Private (Admin only)
router.get('/users/:id', auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/businesses
// @desc    Get all businesses
// @access  Private (Admin only)
router.get('/businesses', auth, admin, async (req, res) => {
  try {
    // Get businesses from merchant users
    const merchants = await User.find({ 
      userType: 'merchant',
      'businessInfo.businessName': { $exists: true, $ne: '' }
    })
    .select('businessInfo fullName email status')
    .sort({ createdAt: -1 });
      const businesses = merchants.map(merchant => ({
      _id: merchant._id,
      id: merchant._id,
      businessName: merchant.businessInfo.businessName,
      businessDescription: merchant.businessInfo.businessDescription || '',
      businessCategory: merchant.businessInfo.businessCategory || 'other',
      businessAddress: merchant.businessInfo.businessAddress || {},
      businessPhone: merchant.businessInfo.businessPhone || '',
      businessEmail: merchant.businessInfo.businessEmail || merchant.email,
      website: merchant.businessInfo.website || '',
      ownerName: merchant.fullName,
      ownerEmail: merchant.email,
      status: merchant.status,
      isVerified: merchant.businessInfo.isVerified || false
    }));
    
    res.json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/plans
// @desc    Get all plans
// @access  Private (Admin only)
router.get('/plans', auth, admin, async (req, res) => {
  try {
    const { userType } = req.query;
    
    // Get plans with optional filtering by userType
    let query = {};
    if (userType) {
      query['metadata.userType'] = userType;
    }
    
    const plans = await Plan.find(query).sort({ priority: -1, createdAt: -1 });
    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/plans
// @desc    Create a new plan
// @access  Private (Admin only)
router.post('/plans', auth, admin, async (req, res) => {
  try {
    const {
      name,
      key,
      price,
      currency,
      features,
      description,
      isActive,
      maxUsers,
      billingCycle,
      priority,
      userType,
      metadata
    } = req.body;

    // Validate required fields
    if (!name || !key || !description) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['name', 'key', 'description'],
        received: { name, key, description }
      });
    }

    // Validate features
    if (!features || !Array.isArray(features) || features.length === 0) {
      return res.status(400).json({ 
        message: 'Features must be a non-empty array',
        received: features
      });
    }    // Check if plan key already exists
    const existingPlan = await Plan.findOne({ key });
    if (existingPlan) {
      return res.status(400).json({ 
        message: 'Plan key already exists',
        existingPlan: existingPlan.key
      });
    }

    // Create plan metadata
    const planMetadata = {
      userType: userType || 'user',
      ...metadata
    };

    const newPlan = new Plan({
      name,
      key,
      price: parseFloat(price) || 0,
      currency: currency || 'GHS',
      features,
      description,
      isActive: isActive !== undefined ? isActive : true,
      maxUsers: maxUsers ? parseInt(maxUsers) : null,
      billingCycle: billingCycle || 'monthly',
      priority: parseInt(priority) || 0,
      metadata: planMetadata
    });    const savedPlan = await newPlan.save();
    
    res.status(201).json(savedPlan);
  } catch (error) {
    console.error('Error creating plan:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors,
        details: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Duplicate key error',
        field: Object.keys(error.keyPattern)[0]
      });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/plans/:id
// @desc    Update a plan
// @access  Private (Admin only)
router.put('/plans/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If key is being updated, check if it already exists
    if (updateData.key) {
      const existingPlan = await Plan.findOne({ key: updateData.key, _id: { $ne: id } });
      if (existingPlan) {
        return res.status(400).json({ message: 'Plan key already exists' });
      }
    }

    const updatedPlan = await Plan.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedPlan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    res.json(updatedPlan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/plans/:id
// @desc    Delete a plan
// @access  Private (Admin only)
router.delete('/plans/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[Plan Delete] Attempting to delete plan with id: ${id}`);
    const plan = await Plan.findById(id);
    if (!plan) {
      console.warn(`[Plan Delete] Plan not found for id: ${id}`);
      return res.status(404).json({ message: 'Plan not found' });
    }
    const deletedPlan = await Plan.findByIdAndDelete(id);
    if (!deletedPlan) {
      console.warn(`[Plan Delete] Plan could not be deleted for id: ${id}`);
      return res.status(404).json({ message: 'Plan not found or already deleted' });
    }
    console.log(`[Plan Delete] Plan deleted successfully for id: ${id}`);
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/plans/seed
// @desc    Seed default plans
// @access  Private (Admin only)
router.post('/plans/seed', auth, admin, async (req, res) => {
  try {
    // Check if plans already exist (make this optional based on force parameter)
    const existingPlans = await Plan.countDocuments();
    const force = req.body.force || req.query.force;
    
    if (existingPlans > 0 && !force) {
      return res.status(400).json({ 
        message: 'Plans already exist. Use force=true to override.',
        count: existingPlans,
        hint: 'Add ?force=true to the request to seed anyway'
      });
    }
      // If force is true, delete existing plans first
    if (force && existingPlans > 0) {
      await Plan.deleteMany({});
    }

    // Default user plans
    const userPlans = [
      {
        name: 'Community',
        key: 'community',
        price: 0,
        currency: 'GHS',
        features: [
          'Basic membership card',
          'Access to community events',
          'Newsletter subscription',
          'Basic directory access'
        ],
        description: 'Free community membership with basic features',
        isActive: true,
        maxUsers: null,
        billingCycle: 'lifetime',
        priority: 1,
        metadata: { userType: 'user' }
      },
      {
        name: 'Silver',
        key: 'silver',
        price: 50,
        currency: 'GHS',
        features: [
          'All Community features',
          'Premium membership card',
          'Priority event booking',
          'Exclusive member deals',
          'Monthly newsletter'
        ],
        description: 'Premium membership with enhanced benefits',
        isActive: true,
        maxUsers: null,
        billingCycle: 'yearly',
        priority: 2,
        metadata: { userType: 'user' }
      },
      {
        name: 'Gold',
        key: 'gold',
        price: 100,
        currency: 'GHS',
        features: [
          'All Silver features',
          'VIP membership card',
          'Concierge services',
          'Exclusive gold events',
          'Personal account manager',
          'Business networking access'
        ],
        description: 'Ultimate membership with premium services',
        isActive: true,
        maxUsers: null,
        billingCycle: 'yearly',
        priority: 3,
        metadata: { userType: 'user' }
      }
    ];

    // Default merchant plans
    const merchantPlans = [
      {
        name: 'Basic Business',
        key: 'basic_business',
        price: 100,
        currency: 'GHS',
        features: [
          'Business directory listing',
          'Basic business profile',
          'Customer reviews',
          'Contact information display',
          'Basic analytics'
        ],
        description: 'Essential business listing with basic features',
        isActive: true,
        maxUsers: null,
        billingCycle: 'yearly',
        priority: 1,
        metadata: { userType: 'merchant' }
      },
      {
        name: 'Professional Business',
        key: 'professional_business',
        price: 200,
        currency: 'GHS',
        features: [
          'All Basic Business features',
          'Featured business listing',
          'Photo gallery',
          'Business hours display',
          'Social media integration',
          'Advanced analytics',
          'Deal posting capability'
        ],
        description: 'Professional business presence with marketing tools',
        isActive: true,
        maxUsers: null,
        billingCycle: 'yearly',
        priority: 2,
        metadata: { userType: 'merchant' }
      },
      {
        name: 'Enterprise Business',
        key: 'enterprise_business',
        price: 500,
        currency: 'GHS',
        features: [
          'All Professional Business features',
          'Premium placement',
          'Custom business page',
          'Event hosting capability',
          'Priority customer support',
          'API access',
          'Custom integrations',
          'Dedicated account manager'
        ],
        description: 'Enterprise-level business solutions',
        isActive: true,
        maxUsers: null,
        billingCycle: 'yearly',
        priority: 3,
        metadata: { userType: 'merchant' }
      }
    ];    // Insert all plans
    const allPlans = [...userPlans, ...merchantPlans];
    
    const insertedPlans = await Plan.insertMany(allPlans);

    res.json({ 
      message: 'Default plans seeded successfully', 
      count: insertedPlans.length,
      plans: insertedPlans
    });} catch (error) {
    console.error('Error seeding plans:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      errors: error.errors
    });
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error in seed data',
        errors: error.errors,
        details: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message,
          value: error.errors[key].value
        }))
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Duplicate key error in seed data',
        field: Object.keys(error.keyPattern || {})[0],
        keyPattern: error.keyPattern
      });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   DELETE /api/admin/plans/all
// @desc    Delete all plans (for testing/cleanup)
// @access  Private (Admin only)
router.delete('/plans/all', auth, admin, async (req, res) => {
  try {
    const result = await Plan.deleteMany({});
    res.json({ 
      message: 'All plans deleted successfully', 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting all plans:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/plans/debug
// @desc    Get debug information about plans
// @access  Private (Admin only)
router.get('/plans/debug', auth, admin, async (req, res) => {
  try {
    const plans = await Plan.find({});
    const planKeys = plans.map(p => p.key);
    const planNames = plans.map(p => p.name);
    
    res.json({
      total: plans.length,
      plans: plans.map(p => ({
        id: p._id,
        name: p.name,
        key: p.key,
        price: p.price,
        features: p.features.length,
        metadata: p.metadata
      })),
      duplicateKeys: planKeys.filter((key, index) => planKeys.indexOf(key) !== index),
      duplicateNames: planNames.filter((name, index) => planNames.indexOf(name) !== index)
    });
  } catch (error) {    console.error('Error getting plan debug info:', error);
    res.status(500).json({ message: 'Server error' });  }
});

// @route   POST /api/admin/partners/register
// @desc    Register a new partner (merchant) with plan assignment
// @access  Private (Admin only)
router.post('/partners/register', auth, admin, async (req, res) => {
  try {
    const {
      businessName,
      category,
      ownerName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      website,
      description,
      establishedYear,
      employeeCount,
      taxId,
      planType
    } = req.body;

    // Validate required fields
    if (!businessName || !category || !ownerName || !email || !phone) {
      return res.status(400).json({ 
        message: 'Please provide all required fields: businessName, category, ownerName, email, phone' 
      });
    }

    // Validate plan type
    const validMembershipTypes = ['basic_business', 'professional_business', 'enterprise_business'];
    if (planType && !validMembershipTypes.includes(planType)) {
      return res.status(400).json({ message: 'Invalid plan type' });
    }

    // Check if user with email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'A user with this email already exists' 
      });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create the new merchant user
    const newMerchant = new User({
      fullName: ownerName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      userType: 'merchant',
      membershipType: planType || 'basic_business',
      status: 'approved',
      address: {
        street: address,
        city,
        state,
        zipCode,
        country: 'Ghana'
      },
      businessInfo: {
        businessName,
        businessCategory: category,
        businessDescription: description,
        businessAddress: {
          street: address,
          city,
          state,
          zipCode,
          country: 'Ghana'
        },
        businessPhone: phone,
        businessEmail: email.toLowerCase(),
        website,
        taxId,
        isVerified: true,
        verificationDate: new Date()
      },
      joinDate: new Date(),
      isActive: true,
      planAssignedAt: new Date(),
      planAssignedBy: req.user._id
    });

    await newMerchant.save();

    res.status(201).json({
      message: 'Partner registered successfully',
      partner: {
        id: newMerchant._id,
        businessName: newMerchant.businessInfo.businessName,
        ownerName: newMerchant.fullName,
        email: newMerchant.email,
        phone: newMerchant.phone,
        category: newMerchant.businessInfo.businessCategory,
        planType: newMerchant.membershipType,
        status: newMerchant.status,
        joinDate: newMerchant.joinDate
      },
      temporaryPassword: tempPassword
    });
  } catch (error) {
    console.error('Error registering partner:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/partners
// @desc    Get all business partners with pagination
// @access  Private (Admin only)
router.get('/partners', auth, admin, async (req, res) => {
  try {
    // Parse query parameters for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || 'all';    const category = req.query.category || 'all';
    const search = req.query.search || '';
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    // Build filter object
    let filter = {
      userType: 'merchant',
      'businessInfo.businessName': { $exists: true, $ne: '' }
    };

    // Filter by status
    if (status !== 'all') {
      filter.status = status;
    }

    // Filter by category
    if (category !== 'all') {
      filter['businessInfo.businessCategory'] = category;
    }

    // Search filter
    if (search) {
      filter.$or = [
        { 'businessInfo.businessName': { $regex: search, $options: 'i' } },
        { 'businessInfo.businessDescription': { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalPartners = await User.countDocuments(filter);

    // Get merchants with pagination
    const merchants = await User.find(filter)
      .select('businessInfo fullName email status createdAt membershipType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Transform merchant data to partner format
    const partners = merchants.map(merchant => ({
      id: merchant._id,
      businessName: merchant.businessInfo.businessName,
      businessDescription: merchant.businessInfo.businessDescription || '',
      businessCategory: merchant.businessInfo.businessCategory || 'other',
      businessAddress: merchant.businessInfo.businessAddress || {},
      businessPhone: merchant.businessInfo.businessPhone || '',
      businessEmail: merchant.businessInfo.businessEmail || merchant.email,
      website: merchant.businessInfo.website || '',
      ownerName: merchant.fullName,
      ownerEmail: merchant.email,
      status: merchant.status,
      membershipType: merchant.membershipType || 'community',
      isVerified: merchant.businessInfo.isVerified || false,
      createdAt: merchant.createdAt
    }));

    res.json({
      partners,
      totalPartners,
      currentPage: page,
      totalPages: Math.ceil(totalPartners / limit),
      pageSize: limit
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/partners/:id/status
// @desc    Update partner status
// @access  Private (Admin only)
router.put('/partners/:id/status', auth, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const partnerId = req.params.id;

    // Validate status
    if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Find the merchant user
    const merchant = await User.findById(partnerId);
    if (!merchant) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    if (merchant.userType !== 'merchant') {
      return res.status(400).json({ message: 'User is not a merchant' });
    }

    // Update status
    merchant.status = status;
    await merchant.save();

    res.json({ 
      message: `Partner ${status} successfully`,
      partner: {
        id: merchant._id,
        businessName: merchant.businessInfo.businessName,
        ownerName: merchant.fullName,
        status: merchant.status
      }
    });
  } catch (error) {
    console.error('Error updating partner status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/partners/bulk-approve
// @desc    Bulk approve partners
// @access  Private (Admin only)
router.post('/partners/bulk-approve', auth, admin, async (req, res) => {
  try {
    const { partnerIds } = req.body;

    if (!Array.isArray(partnerIds) || partnerIds.length === 0) {
      return res.status(400).json({ message: 'Partner IDs array is required' });
    }

    // Update partners status to approved
    const result = await User.updateMany(
      { 
        _id: { $in: partnerIds },
        userType: 'merchant'
      },
      { status: 'approved' }
    );

    res.json({
      message: `${result.modifiedCount} partners approved successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk approving partners:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/partners/bulk-reject
// @desc    Bulk reject partners
// @access  Private (Admin only)
router.post('/partners/bulk-reject', auth, admin, async (req, res) => {
  try {
    const { partnerIds } = req.body;

    if (!Array.isArray(partnerIds) || partnerIds.length === 0) {
      return res.status(400).json({ message: 'Partner IDs array is required' });
    }

    // Update partners status to rejected
    const result = await User.updateMany(
      { 
        _id: { $in: partnerIds },
        userType: 'merchant'
      },
      { status: 'rejected' }
    );

    res.json({
      message: `${result.modifiedCount} partners rejected successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk rejecting partners:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/partners/bulk-suspend
// @desc    Bulk suspend partners
// @access  Private (Admin only)
router.post('/partners/bulk-suspend', auth, admin, async (req, res) => {
  try {
    const { partnerIds } = req.body;

    if (!Array.isArray(partnerIds) || partnerIds.length === 0) {
      return res.status(400).json({ message: 'Partner IDs array is required' });
    }

    // Update partners status to suspended
    const result = await User.updateMany(
      { 
        _id: { $in: partnerIds },
        userType: 'merchant'
      },
      { status: 'suspended' }
    );
    
    res.json({ 
      message: `${result.modifiedCount} partners suspended successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk suspending partners:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/settings
// @desc    Get admin settings (create defaults if not exist)
// @access  Private (Admin only)
router.get('/settings', auth, admin, async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) {
      // Create default settings if not found
      settings = new AdminSettings({});
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update admin settings
// @access  Private (Admin only)
router.put('/settings', auth, admin, async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = new AdminSettings({});
    }
    Object.assign(settings, req.body);
    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error('Error updating admin settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

