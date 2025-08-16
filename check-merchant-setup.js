const mysql = require('mysql2');
require('dotenv').config();

// Create connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Promisify query
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

async function checkMerchantSetup() {
  try {
    console.log('🔍 CHECKING MERCHANT SETUP\n');

    // 1. Check all users and their types
    console.log('1. All users and their types:');
    const users = await queryAsync(`
      SELECT id, fullName, email, userType, status, membershipType, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.table(users);

    // 2. Check merchant users specifically
    console.log('\n2. Merchant users:');
    const merchants = await queryAsync(`
      SELECT id, fullName, email, userType, status, membershipType, created_at
      FROM users
      WHERE userType = 'merchant'
      ORDER BY created_at DESC
    `);
    
    if (merchants.length > 0) {
      console.table(merchants);
    } else {
      console.log('❌ No merchant users found!');
      console.log('💡 This is likely the issue - users need userType = "merchant"');
    }

    // 3. Check businesses table
    console.log('\n3. Businesses and their user associations:');
    const businesses = await queryAsync(`
      SELECT b.businessId, b.businessName, b.userId, u.fullName, u.email, u.userType, u.status
      FROM businesses b
      LEFT JOIN users u ON b.userId = u.id
      ORDER BY b.created_at DESC
      LIMIT 10
    `);
    
    if (businesses.length > 0) {
      console.table(businesses);
    } else {
      console.log('❌ No businesses found!');
    }

    // 4. Check for users who might need to be converted to merchants
    console.log('\n4. Users who might need merchant conversion:');
    const potentialMerchants = await queryAsync(`
      SELECT u.id, u.fullName, u.email, u.userType, u.status, 
             CASE 
               WHEN b.userId IS NOT NULL THEN 'Has Business'
               ELSE 'No Business'
             END as businessStatus
      FROM users u
      LEFT JOIN businesses b ON u.id = b.userId
      WHERE u.userType != 'merchant' AND u.userType != 'admin'
      ORDER BY u.created_at DESC
      LIMIT 5
    `);
    
    if (potentialMerchants.length > 0) {
      console.table(potentialMerchants);
    }

    // 5. Check merchant plans
    console.log('\n5. Available merchant plans:');
    const plans = await queryAsync(`
      SELECT name, \`key\`, type, isActive, max_deals_per_month, price, priority
      FROM plans
      WHERE type = 'merchant' AND isActive = 1
      ORDER BY priority ASC
    `);
    
    if (plans.length > 0) {
      console.table(plans);
    } else {
      console.log('❌ No active merchant plans found!');
    }

    console.log('\n✅ ANALYSIS COMPLETE\n');
    
    console.log('📋 RECOMMENDATIONS:');
    if (merchants.length === 0) {
      console.log('1. ❌ CRITICAL: No merchant users found');
      console.log('   - Users need userType = "merchant" to access merchant endpoints');
      console.log('   - Current users may need to be converted to merchants');
    }
    
    if (businesses.length === 0) {
      console.log('2. ❌ CRITICAL: No businesses found');
      console.log('   - Merchants need associated business records');
    }
    
    const approvedMerchants = merchants.filter(m => m.status === 'approved');
    if (approvedMerchants.length === 0) {
      console.log('3. ❌ CRITICAL: No approved merchants');
      console.log('   - Merchants need status = "approved" to access endpoints');
    }

    if (plans.length === 0) {
      console.log('4. ⚠️ WARNING: No merchant plans available');
      console.log('   - Users need valid membershipType linked to merchant plans');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.end();
  }
}

checkMerchantSetup();
