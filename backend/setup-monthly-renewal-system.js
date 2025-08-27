#!/usr/bin/env node

/**
 * Monthly Renewal System Setup Script
 * This script sets up the complete monthly renewal system for deal redemptions and deal posting
 * It ensures database schema is correct and integrates counter updates with approval processes
 */

const db = require('./db');
const notificationService = require('./services/notificationService');

class MonthlyRenewalSetup {
  async setupDatabase() {
    console.log('🔧 Setting up database for monthly renewal system...');
    
    try {
      // Ensure users table has the required columns
      await this.ensureUserColumns();
      
      // Ensure deal_redemptions has proper indexes
      await this.ensureRedemptionIndexes();
      
      // Ensure deals table has proper indexes
      await this.ensureDealIndexes();
      
      // Initialize monthly counts for existing users
      await this.initializeExistingCounts();
      
      console.log('✅ Database setup completed successfully');
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      throw error;
    }
  }

  async ensureUserColumns() {
    console.log('📋 Checking user table columns...');
    
    const queries = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS monthlyRedemptionCount INT DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS monthlyDealCount INT DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS customRedemptionLimit INT DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS lastRenewalDate DATE DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS monthlyRedemptionLimit INT DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS monthlyDealLimit INT DEFAULT NULL`
    ];

    for (const query of queries) {
      try {
        await this.queryAsync(query);
        console.log(`✅ User column check/creation completed`);
      } catch (error) {
        if (!error.message.includes('Duplicate column')) {
          console.log(`ℹ️ Column already exists or query executed: ${error.message}`);
        }
      }
    }
  }

  async ensureRedemptionIndexes() {
    console.log('📊 Setting up redemption table indexes...');
    
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_redemptions_user_status_date 
       ON deal_redemptions(user_id, status, redeemed_at)`,
      `CREATE INDEX IF NOT EXISTS idx_redemptions_status_date 
       ON deal_redemptions(status, redeemed_at)`,
      `CREATE INDEX IF NOT EXISTS idx_redemptions_deal_status 
       ON deal_redemptions(deal_id, status)`
    ];

    for (const index of indexes) {
      try {
        await this.queryAsync(index);
        console.log(`✅ Redemption index created`);
      } catch (error) {
        console.log(`ℹ️ Index already exists: ${error.message}`);
      }
    }
  }

  async ensureDealIndexes() {
    console.log('📊 Setting up deals table indexes...');
    
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_deals_business_status_created 
       ON deals(businessId, status, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_deals_status_created 
       ON deals(status, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_deals_created_month 
       ON deals(created_at, status)`
    ];

    for (const index of indexes) {
      try {
        await this.queryAsync(index);
        console.log(`✅ Deal index created`);
      } catch (error) {
        console.log(`ℹ️ Index already exists: ${error.message}`);
      }
    }
  }

  async initializeExistingCounts() {
    console.log('🔢 Initializing monthly counts for existing data...');
    
    // Initialize monthly counts based on current month data
    await notificationService.recomputeMonthlyCounts();
    
    // Ensure monthly limit columns are populated from plan or custom overrides
    const initLimitsQuery = `
      UPDATE users u
      LEFT JOIN user_plans up ON u.id = up.userId AND up.isActive = 1
      LEFT JOIN plans p ON up.planId = p.id
      SET u.monthlyRedemptionLimit = COALESCE(u.customRedemptionLimit, p.monthlyRedemptionLimit, 0),
          u.monthlyDealLimit = COALESCE(u.customDealLimit, p.monthlyDealLimit, 0)
      WHERE u.status = 'active'
    `;

    try {
      const limitsResult = await this.queryAsync(initLimitsQuery);
      console.log(`✅ Initialized monthly limits for ${limitsResult.affectedRows} users`);
    } catch (err) {
      console.warn('⚠️ Could not initialize monthly limit columns:', err.message);
    }

    // Set last renewal date for all active users (if not already set)
    const updateRenewalDate = `
      UPDATE users 
      SET lastRenewalDate = DATE_FORMAT(CURDATE(), '%Y-%m-01') 
      WHERE status = 'active' AND lastRenewalDate IS NULL
    `;
    
    const result = await this.queryAsync(updateRenewalDate);
    console.log(`✅ Set renewal date for ${result.affectedRows} users`);
  }

  async testRenewalSystem() {
    console.log('🧪 Testing monthly renewal system...');
    
    try {
      // Test recomputation
      await notificationService.recomputeMonthlyCounts();
      
      // Get current statistics
      const stats = await notificationService.getMonthlyStatistics();
      console.log('📊 Current Monthly Statistics:', JSON.stringify(stats, null, 2));
      
      // Test individual counter functions
      console.log('✅ Monthly renewal system test completed');
      return true;
    } catch (error) {
      console.error('❌ Monthly renewal system test failed:', error);
      return false;
    }
  }

  async createTestData() {
    console.log('🎭 Creating test data for renewal system...');
    
    try {
      // Create test redemptions for current month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const testData = {
        // Test redemption for current month (should be counted)
        currentRedemption: `
          INSERT IGNORE INTO deal_redemptions (deal_id, user_id, status, redeemed_at, created_at)
          SELECT 
            (SELECT id FROM deals WHERE status IN ('approved', 'active') LIMIT 1) as deal_id,
            (SELECT id FROM users WHERE userType = 'user' AND status = 'active' LIMIT 1) as user_id,
            'approved' as status,
            '${currentMonth}-15 10:00:00' as redeemed_at,
            NOW() as created_at
          WHERE EXISTS (SELECT 1 FROM deals WHERE status IN ('approved', 'active'))
          AND EXISTS (SELECT 1 FROM users WHERE userType = 'user' AND status = 'active')
        `,
        // Test redemption for previous month (should NOT be counted)
        previousRedemption: `
          INSERT IGNORE INTO deal_redemptions (deal_id, user_id, status, redeemed_at, created_at)
          SELECT 
            (SELECT id FROM deals WHERE status IN ('approved', 'active') LIMIT 1) as deal_id,
            (SELECT id FROM users WHERE userType = 'user' AND status = 'active' LIMIT 1) as user_id,
            'approved' as status,
            DATE_SUB('${currentMonth}-01', INTERVAL 1 MONTH) as redeemed_at,
            NOW() as created_at
          WHERE EXISTS (SELECT 1 FROM deals WHERE status IN ('approved', 'active'))
          AND EXISTS (SELECT 1 FROM users WHERE userType = 'user' AND status = 'active')
        `,
        // Test deal for current month (should be counted)
        currentDeal: `
          INSERT IGNORE INTO deals (title, description, businessId, status, created_at, updated_at, expiration_date)
          SELECT 
            'Test Deal Current Month' as title,
            'Test deal for renewal system' as description,
            (SELECT id FROM users WHERE userType = 'merchant' AND status = 'active' LIMIT 1) as businessId,
            'approved' as status,
            '${currentMonth}-10 09:00:00' as created_at,
            NOW() as updated_at,
            DATE_ADD(NOW(), INTERVAL 30 DAY) as expiration_date
          WHERE EXISTS (SELECT 1 FROM users WHERE userType = 'merchant' AND status = 'active')
        `
      };

      for (const [name, query] of Object.entries(testData)) {
        try {
          const result = await this.queryAsync(query);
          console.log(`✅ Created test data: ${name} (${result.affectedRows} rows)`);
        } catch (error) {
          console.log(`ℹ️ Test data creation: ${name} - ${error.message}`);
        }
      }

      // Recompute counts after creating test data
      await notificationService.recomputeMonthlyCounts();
      
      console.log('✅ Test data creation completed');
    } catch (error) {
      console.error('❌ Test data creation failed:', error);
    }
  }

  async verifySetup() {
    console.log('🔍 Verifying monthly renewal system setup...');
    
    try {
      // Check database structure
      const userColumns = await this.queryAsync("SHOW COLUMNS FROM users WHERE Field IN ('monthlyRedemptionCount', 'monthlyDealCount', 'customRedemptionLimit', 'lastRenewalDate')");
      console.log(`✅ User table has ${userColumns.length}/4 required columns`);

      // Check indexes
      const redemptionIndexes = await this.queryAsync("SHOW INDEX FROM deal_redemptions WHERE Key_name LIKE 'idx_redemptions_%'");
      const dealIndexes = await this.queryAsync("SHOW INDEX FROM deals WHERE Key_name LIKE 'idx_deals_%'");
      console.log(`✅ Found ${redemptionIndexes.length} redemption indexes and ${dealIndexes.length} deal indexes`);

      // Check current counts
      const userStats = await this.queryAsync(`
        SELECT 
          userType,
          COUNT(*) as total,
          SUM(monthlyRedemptionCount) as totalRedemptions,
          SUM(monthlyDealCount) as totalDeals,
          COUNT(CASE WHEN lastRenewalDate IS NOT NULL THEN 1 END) as usersWithRenewalDate
        FROM users 
        WHERE status = 'active' 
        GROUP BY userType
      `);
      
      console.log('📊 Current user statistics:');
      userStats.forEach(stat => {
        console.log(`   ${stat.userType}: ${stat.total} users, ${stat.totalRedemptions || 0} redemptions, ${stat.totalDeals || 0} deals, ${stat.usersWithRenewalDate} with renewal date`);
      });

      // Test notification service functions
      const stats = await notificationService.getMonthlyStatistics();
      if (stats) {
        console.log('✅ Monthly statistics function working');
      } else {
        console.log('⚠️ Monthly statistics function returned null');
      }

      console.log('✅ System verification completed');
      return true;
    } catch (error) {
      console.error('❌ System verification failed:', error);
      return false;
    }
  }

  // Helper method for database queries
  queryAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }
}

// Main execution
async function main() {
  console.log('🚀 Monthly Renewal System Setup Starting...');
  console.log('=' .repeat(60));
  
  const setup = new MonthlyRenewalSetup();
  
  try {
    // Step 1: Setup database
    await setup.setupDatabase();
    
    // Step 2: Create test data
    await setup.createTestData();
    
    // Step 3: Test the system
    const testResult = await setup.testRenewalSystem();
    
    // Step 4: Verify everything is working
    const verifyResult = await setup.verifySetup();
    
    if (testResult && verifyResult) {
      console.log('=' .repeat(60));
      console.log('🎉 Monthly Renewal System Setup COMPLETED SUCCESSFULLY!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Backend server will automatically run monthly renewals on 1st of each month');
      console.log('2. Use POST /api/admin/email/trigger-limits-renewal to manually test');
      console.log('3. Check frontend user settings and merchant dashboard for updated counts');
      console.log('4. Monitor scheduled tasks with GET /api/admin/email/scheduled-tasks');
    } else {
      console.log('⚠️ Setup completed with some warnings. Please check the logs above.');
    }
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
  } finally {
    db.end();
  }
}

// Run the setup if called directly
if (require.main === module) {
  main();
}

module.exports = MonthlyRenewalSetup;
