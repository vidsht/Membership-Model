// Plan model for MySQL database operations
const db = require('../db');

// Utility function to promisify db.query
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

class Plan {
  constructor(data) {
    Object.assign(this, data);
  }

  // Get all plans with optional filtering
  static async getAll(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.type) {
        whereClause += ' AND type = ?';
        params.push(filters.type);
      }

      if (filters.isActive !== undefined) {
        whereClause += ' AND isActive = ?';
        params.push(filters.isActive ? 1 : 0);
      }

      if (filters.priority) {
        whereClause += ' AND priority >= ?';
        params.push(filters.priority);
      }

      const plans = await queryAsync(`
        SELECT id, name, \`key\`, type, price, currency, billingCycle, duration,
               features, dealAccess, priority, maxDeals, maxRedemptions, dealPostingLimit,
               customKeys, isActive, sortOrder, createdAt, updatedAt
        FROM plans 
        ${whereClause}
        ORDER BY type, sortOrder, priority DESC
      `, params);

      return plans.map(plan => new Plan({
        ...plan,
        features: plan.features ? plan.features.split(',') : [],
        customKeys: plan.customKeys ? JSON.parse(plan.customKeys) : {}
      }));
    } catch (error) {
      throw new Error(`Error fetching plans: ${error.message}`);
    }
  }

  // Get plan by ID
  static async getById(id) {
    try {
      const plans = await queryAsync(`
        SELECT id, name, \`key\`, type, price, currency, billingCycle, duration,
               features, dealAccess, priority, maxDeals, maxRedemptions, dealPostingLimit,
               customKeys, isActive, sortOrder, createdAt, updatedAt
        FROM plans 
        WHERE id = ?
      `, [id]);

      if (!plans.length) {
        return null;
      }

      const plan = plans[0];
      return new Plan({
        ...plan,
        features: plan.features ? plan.features.split(',') : [],
        customKeys: plan.customKeys ? JSON.parse(plan.customKeys) : {}
      });
    } catch (error) {
      throw new Error(`Error fetching plan: ${error.message}`);
    }
  }

  // Get plan by key
  static async getByKey(key) {
    try {
      const plans = await queryAsync(`
        SELECT id, name, \`key\`, type, price, currency, billingCycle, duration,
               features, dealAccess, priority, maxDeals, maxRedemptions, dealPostingLimit,
               customKeys, isActive, sortOrder, createdAt, updatedAt
        FROM plans 
        WHERE \`key\` = ?
      `, [key]);

      if (!plans.length) {
        return null;
      }

      const plan = plans[0];
      return new Plan({
        ...plan,
        features: plan.features ? plan.features.split(',') : [],
        customKeys: plan.customKeys ? JSON.parse(plan.customKeys) : {}
      });
    } catch (error) {
      throw new Error(`Error fetching plan: ${error.message}`);
    }
  }

  // Create new plan
  static async create(planData) {
    try {
      const {
        name, key, type, price, currency = 'GHS', billingCycle = 'monthly', duration = '1 month',
        features = [], dealAccess = '', priority = 1, maxDeals = null, maxRedemptions = null,
        dealPostingLimit = null, customKeys = {}, isActive = true, sortOrder = 0
      } = planData;

      // Check if plan key already exists
      const existingPlan = await Plan.getByKey(key);
      if (existingPlan) {
        throw new Error('Plan key already exists');
      }

      const featuresStr = Array.isArray(features) ? features.join(',') : features;

      const result = await queryAsync(`
        INSERT INTO plans (name, \`key\`, type, price, currency, billingCycle, duration,
                          features, dealAccess, priority, maxDeals, maxRedemptions, dealPostingLimit,
                          customKeys, isActive, sortOrder, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        name, key, type, price, currency, billingCycle, duration,
        featuresStr, dealAccess, priority, maxDeals, maxRedemptions, dealPostingLimit,
        JSON.stringify(customKeys), isActive ? 1 : 0, sortOrder
      ]);

      return await Plan.getById(result.insertId);
    } catch (error) {
      throw new Error(`Error creating plan: ${error.message}`);
    }
  }

  // Update plan
  async update(updateData) {
    try {
      const allowedFields = [
        'name', 'key', 'type', 'price', 'currency', 'billingCycle', 'duration',
        'features', 'dealAccess', 'priority', 'maxDeals', 'maxRedemptions', 
        'dealPostingLimit', 'customKeys', 'isActive', 'sortOrder'
      ];

      const updates = [];
      const values = [];

      Object.keys(updateData).forEach(field => {
        if (allowedFields.includes(field) && updateData[field] !== undefined) {
          if (field === 'features' && Array.isArray(updateData[field])) {
            updates.push('features = ?');
            values.push(updateData[field].join(','));
          } else if (field === 'customKeys') {
            updates.push('customKeys = ?');
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
        throw new Error('No valid fields to update');
      }

      updates.push('updated_at = NOW()');
      values.push(this.id);

      const updateQuery = `UPDATE plans SET ${updates.join(', ')} WHERE id = ?`;
      await queryAsync(updateQuery, values);

      // Refresh the instance with updated data
      const updatedPlan = await Plan.getById(this.id);
      Object.assign(this, updatedPlan);

      return this;
    } catch (error) {
      throw new Error(`Error updating plan: ${error.message}`);
    }
  }

  // Soft delete (deactivate) or hard delete if unused
  async delete() {
    try {
      // Check if plan is being used
      const usersWithPlan = await queryAsync('SELECT COUNT(*) as count FROM users WHERE membershipType = ?', [this.key]);
      const merchantsWithPlan = await queryAsync('SELECT COUNT(*) as count FROM businesses WHERE currentPlan = ?', [this.key]);

      if (usersWithPlan[0].count > 0 || merchantsWithPlan[0].count > 0) {
        // Soft delete - just deactivate
        await queryAsync('UPDATE plans SET isActive = 0, updated_at = NOW() WHERE id = ?', [this.id]);
        this.isActive = false;
        return { type: 'soft', message: 'Plan deactivated (users/merchants still using this plan)' };
      } else {
        // Hard delete
        await queryAsync('DELETE FROM plans WHERE id = ?', [this.id]);
        return { type: 'hard', message: 'Plan deleted successfully' };
      }
    } catch (error) {
      throw new Error(`Error deleting plan: ${error.message}`);
    }
  }

  // Activate a deactivated plan
  async activate() {
    try {
      await queryAsync('UPDATE plans SET isActive = 1, updated_at = NOW() WHERE id = ?', [this.id]);
      this.isActive = true;
      return this;
    } catch (error) {
      throw new Error(`Error activating plan: ${error.message}`);
    }
  }

  // Get usage statistics for this plan
  async getUsageStats() {
    try {
      const userCount = await queryAsync('SELECT COUNT(*) as count FROM users WHERE membershipType = ? AND userType != "merchant"', [this.key]);
      const merchantCount = await queryAsync('SELECT COUNT(*) as count FROM users WHERE membershipType = ? AND userType = "merchant"', [this.key]);
      
      // Calculate revenue (approximate)
      const userRevenue = userCount[0].count * this.price;
      const merchantUserRevenue = await queryAsync('SELECT COUNT(*) as count FROM users WHERE membershipType = ? AND userType = "merchant"', [this.key]);
      const merchantRevenue = merchantUserRevenue[0].count * this.price;

      return {
        userCount: userCount[0].count,
        merchantCount: merchantCount[0].count,
        totalUsers: userCount[0].count + merchantCount[0].count,
        estimatedRevenue: userRevenue + merchantRevenue
      };
    } catch (error) {
      throw new Error(`Error fetching usage stats: ${error.message}`);
    }
  }

  // Check if user can access deals based on plan priority
  canAccessDeal(dealPriority) {
    return this.priority >= dealPriority;
  }

  // Check if merchant can post deals based on current usage
  async canPostDeal(merchantId) {
    try {
      if (this.dealPostingLimit === -1) return true; // Unlimited

      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const usedDeals = await queryAsync(`
        SELECT COUNT(*) as count 
        FROM deals 
        WHERE merchantId = ? AND DATE_FORMAT(createdAt, '%Y-%m') = ?
      `, [merchantId, currentMonth]);

      return usedDeals[0].count < this.dealPostingLimit;
    } catch (error) {
      throw new Error(`Error checking deal posting limit: ${error.message}`);
    }
  }

  // Generate expiry date based on billing cycle
  generateExpiryDate(startDate = new Date()) {
    const start = new Date(startDate);
    
    switch (this.billingCycle) {
      case 'monthly':
        return new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
      case 'quarterly':
        return new Date(start.getFullYear(), start.getMonth() + 3, start.getDate());
      case 'yearly':
        return new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
      case 'none':
      case 'lifetime':
        return new Date('2099-12-31'); // Far future date for lifetime plans
      default:
        return new Date(start.getFullYear(), start.getMonth() + 1, start.getDate()); // Default to monthly
    }
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      key: this.key,
      type: this.type,
      price: this.price,
      currency: this.currency,
      billingCycle: this.billingCycle,
      duration: this.duration,
      features: this.features,
      dealAccess: this.dealAccess,
      priority: this.priority,
      maxDeals: this.maxDeals,
      maxRedemptions: this.maxRedemptions,
      dealPostingLimit: this.dealPostingLimit,
      customKeys: this.customKeys,
      isActive: this.isActive,
      sortOrder: this.sortOrder,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Plan;
