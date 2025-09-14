// Plan management routes - MySQL implementation
const express = require('express');
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

// @route   GET /api/plans
// @desc    Get all plans (filtered by type if specified)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { type, isActive } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }
    
    if (isActive !== undefined) {
      whereClause += ' AND isActive = ?';
      params.push(isActive === 'true' ? 1 : 0);
    }      const plans = await queryAsync(`
        SELECT id, name, description, \`key\`, type, price, currency, billingCycle,
               features, dealAccess, priority, maxDealRedemptions as maxRedemptions, 
               max_deals_per_month as dealPostingLimit, metadata as customKeys, 
               isActive, sortOrder, created_at as createdAt, updated_at as updatedAt
        FROM plans 
        ${whereClause}
        ORDER BY type, sortOrder, priority DESC
      `, params);      // Parse JSON fields
      const processedPlans = plans.map(plan => ({
        ...plan,
        features: plan.features ? (typeof plan.features === 'string' ? plan.features.split(',') : plan.features) : [],
        customKeys: plan.customKeys ? (typeof plan.customKeys === 'string' ? JSON.parse(plan.customKeys) : plan.customKeys) : {}
      }));
    
    res.json({ success: true, plans: processedPlans });
  } catch (err) {
    console.error('Error fetching plans:', err);
    res.status(500).json({ success: false, message: 'Server error fetching plans' });  }
});

// @route   GET /api/plans/user-plans
// @desc    Get user plans simplified for deal forms
// @access  Public
router.get('/user-plans', async (req, res) => {
  try {
    const plans = await queryAsync(`
      SELECT id, name, \`key\`, priority, dealAccess, maxDealRedemptions as maxRedemptions
      FROM plans 
      WHERE type = 'user' AND isActive = 1
      ORDER BY priority DESC
    `);
    
    res.json({ success: true, plans });
  } catch (err) {
    console.error('Error fetching user plans:', err);
    res.status(500).json({ success: false, message: 'Server error fetching user plans' });
  }
});

// @route   GET /api/plans/:id
// @desc    Get a specific plan by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const planId = parseInt(req.params.id);      const plans = await queryAsync(`
        SELECT id, name, description, \`key\`, type, price, currency, billingCycle,
               features, dealAccess, priority, maxDealRedemptions as maxRedemptions, 
               max_deals_per_month as dealPostingLimit, metadata as customKeys, 
               isActive, sortOrder, created_at as createdAt, updated_at as updatedAt
        FROM plans 
        WHERE id = ?
      `, [planId]);
    
    if (!plans.length) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }      const plan = plans[0];
      plan.features = plan.features ? (typeof plan.features === 'string' ? plan.features.split(',') : plan.features) : [];
      plan.customKeys = plan.customKeys ? (typeof plan.customKeys === 'string' ? JSON.parse(plan.customKeys) : plan.customKeys) : {};
    
    res.json({ success: true, plan });
  } catch (err) {
    console.error('Error fetching plan:', err);
    res.status(500).json({ success: false, message: 'Server error fetching plan' });
  }
});

// @route   POST /api/plans
// @desc    Create a new plan
// @access  Private (Admin only)
router.post('/', 
  auth, 
  admin,
  [
    body('name').notEmpty().withMessage('Plan name is required'),
    body('key').notEmpty().withMessage('Plan key is required'),
    body('type').isIn(['user', 'merchant']).withMessage('Plan type must be user or merchant'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('priority').isInt({ min: 1 }).withMessage('Priority must be a positive integer')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
        const {
        name, key, type, price, currency = 'GHS', billingCycle = 'monthly',
        features = [], dealAccess = '', priority = 1, maxRedemptions = null,
        dealPostingLimit = null, customKeys = {}, isActive = true, sortOrder = 0
      } = req.body;
      
      // Check if plan key already exists
      const existingPlan = await queryAsync('SELECT id FROM plans WHERE `key` = ?', [key]);
      if (existingPlan.length > 0) {
        return res.status(400).json({ success: false, message: 'Plan key already exists' });
      }
      
      // Convert features array to comma-separated string for storage
      const featuresStr = Array.isArray(features) ? features.join(',') : features;
        const result = await queryAsync(`
        INSERT INTO plans (name, \`key\`, type, price, currency, billingCycle,
                          features, dealAccess, priority, maxDealRedemptions, max_deals_per_month,
                          metadata, isActive, sortOrder, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        name, key, type, price, currency, billingCycle,
        featuresStr, dealAccess, priority, maxRedemptions, dealPostingLimit,
        JSON.stringify(customKeys), isActive ? 1 : 0, sortOrder
      ]);
      
      const newPlan = await queryAsync('SELECT * FROM plans WHERE id = ?', [result.insertId]);
      const plan = newPlan[0];
      plan.features = plan.features ? plan.features.split(',') : [];
      plan.customKeys = plan.customKeys ? JSON.parse(plan.customKeys) : {};
      
      res.status(201).json({ success: true, plan, message: 'Plan created successfully' });
    } catch (err) {
      console.error('Error creating plan:', err);
      res.status(500).json({ success: false, message: 'Server error creating plan' });
    }
  }
);

// @route   PUT /api/plans/:id
// @desc    Update a plan
// @access  Private (Admin only)
router.put('/:id', 
  auth, 
  admin,
  [
    body('name').optional().notEmpty().withMessage('Plan name cannot be empty'),
    body('key').optional().notEmpty().withMessage('Plan key cannot be empty'),
    body('type').optional().isIn(['user', 'merchant']).withMessage('Plan type must be user or merchant'),
    body('price').optional().isNumeric().withMessage('Price must be a number'),
    body('priority').optional().isInt({ min: 1 }).withMessage('Priority must be a positive integer')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const planId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Check if plan exists
      const existingPlan = await queryAsync('SELECT * FROM plans WHERE id = ?', [planId]);
      if (!existingPlan.length) {
        return res.status(404).json({ success: false, message: 'Plan not found' });
      }
      
      // If updating key, check if new key already exists
      if (updateData.key && updateData.key !== existingPlan[0].key) {
        const keyExists = await queryAsync('SELECT id FROM plans WHERE `key` = ? AND id != ?', [updateData.key, planId]);
        if (keyExists.length > 0) {
          return res.status(400).json({ success: false, message: 'Plan key already exists' });
        }
      }
        // Build dynamic update query
      const allowedFields = [
        'name', 'key', 'type', 'price', 'currency', 'billingCycle',
        'features', 'dealAccess', 'priority', 'maxDealRedemptions', 
        'max_deals_per_month', 'metadata', 'isActive', 'sortOrder'
      ];
      
      const updates = [];
      const values = [];
        Object.keys(updateData).forEach(field => {
        if (allowedFields.includes(field) && updateData[field] !== undefined) {
          if (field === 'features' && Array.isArray(updateData[field])) {
            updates.push('features = ?');
            values.push(updateData[field].join(','));
          } else if (field === 'maxRedemptions') {
            updates.push('maxDealRedemptions = ?');
            values.push(updateData[field]);
          } else if (field === 'dealPostingLimit') {
            updates.push('max_deals_per_month = ?');
            values.push(updateData[field]);
          } else if (field === 'customKeys') {
            updates.push('metadata = ?');
            values.push(JSON.stringify(updateData[field]));
          } else if (field === 'key') {
            updates.push('`key` = ?');
            values.push(updateData[field]);
          } else if (field === 'isActive') {
            updates.push('isActive = ?');
            values.push(updateData[field] ? 1 : 0);
          } else {
            updates.push(`${field} = ?`);
            values.push(updateData[field]);
          }
        }
      });
      
      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
      }
        updates.push('updated_at = NOW()');
      values.push(planId);
      
      const updateQuery = `UPDATE plans SET ${updates.join(', ')} WHERE id = ?`;
      await queryAsync(updateQuery, values);
      
      // Return updated plan
      const updatedPlan = await queryAsync('SELECT * FROM plans WHERE id = ?', [planId]);
      const plan = updatedPlan[0];
      plan.features = plan.features ? plan.features.split(',') : [];
      plan.customKeys = plan.customKeys ? JSON.parse(plan.customKeys) : {};
      
      res.json({ success: true, plan, message: 'Plan updated successfully' });
    } catch (err) {
      console.error('Error updating plan:', err);
      res.status(500).json({ success: false, message: 'Server error updating plan' });
    }
  }
);

// @route   DELETE /api/plans/:id
// @desc    Delete a plan (soft delete by setting isActive to false)
// @access  Private (Admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    
    // Check if plan exists
    const existingPlan = await queryAsync('SELECT * FROM plans WHERE id = ?', [planId]);
    if (!existingPlan.length) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
      // Check if plan is being used by any users or merchants
    const usersWithPlan = await queryAsync('SELECT COUNT(*) as count FROM users WHERE membershipType = ?', [existingPlan[0].key]);
    const merchantsWithPlan = await queryAsync('SELECT COUNT(*) as count FROM businesses WHERE currentPlan = ?', [existingPlan[0].key]);
    
    if (usersWithPlan[0].count > 0 || merchantsWithPlan[0].count > 0) {      // Soft delete - just deactivate the plan
      await queryAsync('UPDATE plans SET isActive = 0, updated_at = NOW() WHERE id = ?', [planId]);
      res.json({ success: true, message: 'Plan deactivated successfully (users/merchants still using this plan)' });
    } else {
      // Hard delete if no one is using the plan
      await queryAsync('DELETE FROM plans WHERE id = ?', [planId]);
      res.json({ success: true, message: 'Plan deleted successfully' });
    }
  } catch (err) {
    console.error('Error deleting plan:', err);
    res.status(500).json({ success: false, message: 'Server error deleting plan' });
  }
});

// @route   POST /api/plans/:id/activate
// @desc    Activate a deactivated plan
// @access  Private (Admin only)
router.post('/:id/activate', auth, admin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    
    const result = await queryAsync('UPDATE plans SET isActive = 1, updated_at = NOW() WHERE id = ?', [planId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    res.json({ success: true, message: 'Plan activated successfully' });
  } catch (err) {
    console.error('Error activating plan:', err);
    res.status(500).json({ success: false, message: 'Server error activating plan' });
  }
});

// @route   POST /api/plans/seed-defaults
// @desc    Seed default plans (for initial setup)
// @access  Private (Admin only)
router.post('/seed-defaults', auth, admin, async (req, res) => {
  try {
    // Check if plans already exist
    const existingPlans = await queryAsync('SELECT COUNT(*) as count FROM plans');
    if (existingPlans[0].count > 0) {
      return res.status(400).json({ success: false, message: 'Plans already exist. Use regular CRUD operations to manage them.' });
    }
      // Default user plans
    const userPlans = [
      {
        name: 'Community Plan', key: 'community', type: 'user', price: 0, currency: 'FREE',
        billingCycle: 'none', priority: 1, maxRedemptions: 5,
        features: 'Basic directory access,Community updates,Basic support',
        dealAccess: 'Community deals only', sortOrder: 1
      },
      {
        name: 'Silver Plan', key: 'silver', type: 'user', price: 50, currency: 'GHS',
        billingCycle: 'monthly', priority: 2, maxRedemptions: 15,
        features: 'All community features,Priority support,Exclusive deals,Event notifications',
        dealAccess: 'Silver + Community deals', sortOrder: 2
      },
      {
        name: 'Gold Plan', key: 'gold', type: 'user', price: 150, currency: 'GHS',
        billingCycle: 'monthly', priority: 3, maxRedemptions: 50,
        features: 'All silver features,VIP events,Premium support,Business networking,Priority customer service',
        dealAccess: 'All exclusive deals', sortOrder: 3
      },
      {
        name: 'Diamond Plan', key: 'diamond', type: 'user', price: 300, currency: 'GHS',
        billingCycle: 'monthly', priority: 4, maxRedemptions: -1,
        features: 'All gold features,Unlimited deal access,Personal concierge,Exclusive diamond events,Premium partnerships',
        dealAccess: 'All deals + Diamond exclusives', sortOrder: 4
      }
    ];
    
    // Default merchant plans
    const merchantPlans = [
      {
        name: 'Basic Business', key: 'basic_business', type: 'merchant', price: 100, currency: 'GHS',
        billingCycle: 'monthly', priority: 1, dealPostingLimit: 2,
        features: 'Basic listing,Contact information,Basic analytics',
        dealAccess: 'Post basic deals', sortOrder: 1
      },
      {
        name: 'Standard Business', key: 'standard_business', type: 'merchant', price: 200, currency: 'GHS',
        billingCycle: 'monthly', priority: 2, dealPostingLimit: 10,
        features: 'Enhanced listing,Advanced analytics,Priority placement,Social media integration',
        dealAccess: 'Post standard deals', sortOrder: 2
      },
      {
        name: 'Premium Business', key: 'premium_business', type: 'merchant', price: 500, currency: 'GHS',
        billingCycle: 'monthly', priority: 3, dealPostingLimit: 50,
        features: 'Premium listing,Full analytics suite,Featured placement,Marketing tools,Customer insights',
        dealAccess: 'Post premium deals', sortOrder: 3
      },
      {
        name: 'Enterprise Business', key: 'enterprise_business', type: 'merchant', price: 1000, currency: 'GHS',
        billingCycle: 'monthly', priority: 4, dealPostingLimit: -1,
        features: 'Enterprise listing,Advanced API access,Dedicated support,Custom integrations,Unlimited posting',
        dealAccess: 'Post all deal types', sortOrder: 4
      }
    ];
    
    const allPlans = [...userPlans, ...merchantPlans];
      // Insert all plans
    for (const plan of allPlans) {
      await queryAsync(`
        INSERT INTO plans (name, \`key\`, type, price, currency, billingCycle,
                          features, dealAccess, priority, maxDealRedemptions, max_deals_per_month,
                          metadata, isActive, sortOrder, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())
      `, [
        plan.name, plan.key, plan.type, plan.price, plan.currency, plan.billingCycle,
        plan.features, plan.dealAccess, plan.priority, plan.maxRedemptions || null, 
        plan.dealPostingLimit || null, JSON.stringify({}), plan.sortOrder
      ]);
    }
    
    res.json({ success: true, message: `Successfully seeded ${allPlans.length} default plans` });  } catch (err) {
    console.error('Error seeding default plans:', err);
    res.status(500).json({ success: false, message: 'Server error seeding default plans' });
  }
});

module.exports = router;
