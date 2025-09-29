/**
 * Corrected Database Optimization Script for Missing Indexes
 */

const mysql = require('mysql2');
require('dotenv').config();

const correctedOptimizations = [
  // Business table optimizations (corrected column names)
  {
    name: 'Businesses - Owner Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(userId)',
    description: 'Optimize business-to-owner lookups'
  },

  // Deals table optimizations (corrected column names)
  {
    name: 'Deals - Business Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_business ON deals(businessId)',
    description: 'Optimize deals by business lookup'
  },
  {
    name: 'Deals - End Date Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_end_date ON deals(endDate)',
    description: 'Optimize end date queries'
  },
  {
    name: 'Deals - Expiration Date Index', 
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_expiration ON deals(expiration_date)',
    description: 'Optimize expiration date queries and cleanup'
  },
  {
    name: 'Deals - Active Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_active ON deals(isActive)',
    description: 'Optimize active deals filtering'
  },
  {
    name: 'Deals - Views Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_views ON deals(views)',
    description: 'Optimize popular deals sorting'
  },
  {
    name: 'Deals - Redemptions Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_redemptions ON deals(redemptions)',
    description: 'Optimize deal usage analytics'
  },
  {
    name: 'Deals - Plan Level Index',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_plan_level ON deals(requiredPlanLevel(100))',
    description: 'Optimize plan-based deal filtering'
  },

  // Composite indexes for complex queries
  {
    name: 'Deals - Status Active Composite',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_status_active ON deals(status, isActive)',
    description: 'Optimize active deal filtering with status'
  },
  {
    name: 'Deals - Category Status Composite',
    query: 'CREATE INDEX IF NOT EXISTS idx_deals_category_status ON deals(category, status)',
    description: 'Optimize category-based active deal queries'
  },
  {
    name: 'Businesses - Category Verified Composite',
    query: 'CREATE INDEX IF NOT EXISTS idx_businesses_cat_verified ON businesses(businessCategory, isVerified)',
    description: 'Optimize verified business directory by category'
  },
  {
    name: 'Businesses - Status Verified Composite',
    query: 'CREATE INDEX IF NOT EXISTS idx_businesses_status_verified ON businesses(status, isVerified)',
    description: 'Optimize active verified business queries'
  }
];

async function runCorrectedOptimization() {
  console.log('🔧 Running Corrected Database Optimizations');
  console.log('=' .repeat(50));

  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const optimization of correctedOptimizations) {
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

    console.log('\n📊 Corrected Optimization Summary:');
    console.log(`   ✅ Successfully created: ${successCount} indexes`);
    console.log(`   ⚠️ Already existed: ${skipCount} indexes`);
    console.log(`   ❌ Errors: ${errorCount} indexes`);

  } catch (error) {
    console.error('❌ Corrected optimization failed:', error);
  } finally {
    connection.end();
  }
}

runCorrectedOptimization();