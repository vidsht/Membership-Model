/**
 * Database Optimization Script for 1000-2000 Users
 * Creates indexes and optimizes database performance
 */

const mysql = require('mysql2');
require('dotenv').config();

// Database optimization queries
const optimizationQueries = [
  // User table optimizations
  {
    name: 'Users - Email Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    description: 'Optimize login and user lookup by email'
  },
  {
    name: 'Users - Type Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_users_type ON users(userType)',
    description: 'Optimize admin/user filtering'
  },
  {
    name: 'Users - Status Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
    description: 'Optimize active user queries'
  },
  {
    name: 'Users - Registration Date Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_users_created ON users(createdAt)',
    description: 'Optimize user analytics and recent registrations'
  },

  // Business/Merchant table optimizations
  {
    name: 'Businesses - Category Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(businessCategory)',
    description: 'Optimize business directory filtering by category'
  },
  {
    name: 'Businesses - Verification Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_businesses_verified ON businesses(isVerified)',
    description: 'Optimize verified business listings'
  },
  {
    name: 'Businesses - Owner Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(ownerUserId)',
    description: 'Optimize business-to-owner lookups'
  },
  {
    name: 'Businesses - Status Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status)',
    description: 'Optimize active business filtering'
  },

  // Deals table optimizations
  {
    name: 'Deals - Status Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status)',
    description: 'Optimize active/inactive deal filtering'
  },
  {
    name: 'Deals - Business Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_business ON deals(business_id)',
    description: 'Optimize deals by business lookup'
  },
  {
    name: 'Deals - Expiry Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_expiry ON deals(expiryDate)',
    description: 'Optimize expiry date queries and cleanup'
  },
  {
    name: 'Deals - Category Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category)',
    description: 'Optimize deal filtering by category'
  },
  {
    name: 'Deals - Featured Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_featured ON deals(isFeatured)',
    description: 'Optimize featured deals queries'
  },

  // Sessions table optimization
  {
    name: 'Sessions - Expires Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires)',
    description: 'Optimize session cleanup and expiry checks'
  },

  // Email tables optimization
  {
    name: 'Email Queue - Status Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status)',
    description: 'Optimize email queue processing'
  },
  {
    name: 'Email Queue - Priority Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority)',
    description: 'Optimize email priority processing'
  },
  {
    name: 'Email Logs - Recipient Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient)',
    description: 'Optimize email history lookups'
  },
  {
    name: 'Email Logs - Date Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_email_logs_date ON email_logs(created_at)',
    description: 'Optimize email analytics and cleanup'
  },

  // Deal redemptions optimization
  {
    name: 'Deal Redemptions - User Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_redemptions_user ON deal_redemptions(user_id)',
    description: 'Optimize user redemption history'
  },
  {
    name: 'Deal Redemptions - Deal Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_redemptions_deal ON deal_redemptions(deal_id)',
    description: 'Optimize deal usage analytics'
  },
  {
    name: 'Deal Redemptions - Date Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_redemptions_date ON deal_redemptions(redeemed_at)',
    description: 'Optimize redemption analytics by date'
  },

  // User plans optimization
  {
    name: 'User Plans - User Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_user_plans_user ON user_plans(user_id)',
    description: 'Optimize user plan lookups'
  },
  {
    name: 'User Plans - Plan Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_user_plans_plan ON user_plans(plan_id)',
    description: 'Optimize plan analytics'
  },
  {
    name: 'User Plans - Status Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_user_plans_status ON user_plans(status)',
    description: 'Optimize active plan filtering'
  },
  {
    name: 'User Plans - Expiry Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_user_plans_expiry ON user_plans(expires_at)',
    description: 'Optimize plan expiry checks'
  }
];

async function runOptimization() {
  console.log('🔧 Starting Database Optimization for 1000-2000 Users');
  console.log('=' .repeat(60));

  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false
  });

  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✅ Connected to database');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const optimization of optimizationQueries) {
      try {
        console.log(`🔍 ${optimization.name}...`);
        
        await new Promise((resolve, reject) => {
          connection.query(optimization.query, (err, results) => {
            if (err) {
              if (err.code === 'ER_DUP_KEYNAME') {
                console.log(`   ⚠️ Index already exists - skipping`);
                skipCount++;
                resolve();
              } else {
                reject(err);
              }
            } else {
              console.log(`   ✅ ${optimization.description}`);
              successCount++;
              resolve();
            }
          });
        });

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 Optimization Summary:');
    console.log(`   ✅ Successfully created: ${successCount} indexes`);
    console.log(`   ⚠️ Already existed: ${skipCount} indexes`);
    console.log(`   ❌ Errors: ${errorCount} indexes`);

    // Analyze table performance
    console.log('\n🔍 Analyzing table sizes and performance...');
    
    const tableAnalysis = [
      'users', 'businesses', 'deals', 'sessions', 
      'email_queue', 'email_logs', 'deal_redemptions', 'user_plans'
    ];

    for (const table of tableAnalysis) {
      try {
        const stats = await new Promise((resolve, reject) => {
          connection.query(
            `SELECT 
              COUNT(*) as row_count,
              ROUND(DATA_LENGTH/1024/1024, 2) as data_size_mb,
              ROUND(INDEX_LENGTH/1024/1024, 2) as index_size_mb
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
            [process.env.DB_NAME, table],
            (err, results) => {
              if (err) reject(err);
              else resolve(results[0]);
            }
          );
        });

        if (stats) {
          console.log(`   📋 ${table}: ${stats.row_count} rows, ${stats.data_size_mb}MB data, ${stats.index_size_mb}MB indexes`);
        }
      } catch (error) {
        console.log(`   ⚠️ Could not analyze ${table}: ${error.message}`);
      }
    }

    console.log('\n✅ Database optimization completed!');
    console.log('\n💡 Performance Tips:');
    console.log('   1. Monitor slow query log for optimization opportunities');
    console.log('   2. Consider partitioning large tables (email_logs, sessions)');
    console.log('   3. Regular ANALYZE TABLE to update index statistics');
    console.log('   4. Monitor connection pool usage during peak hours');

  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    process.exit(1);
  } finally {
    connection.end();
  }
}

// Run optimization if called directly
if (require.main === module) {
  runOptimization().catch(console.error);
}

module.exports = { runOptimization, optimizationQueries };