const mysql = require('mysql2');

// Database configuration
const dbConfig = {
  host: 'auth-db1388.hstgr.io',
  user: 'u214148440_SachinHursale',
  password: 'Membership@2025',
  database: 'u214148440_membership01'
};

// Enhanced plan system migration
const sqlCommands = [
  // Add missing columns to plans table for enhanced plan management
  `ALTER TABLE plans ADD COLUMN maxDealRedemptions INT DEFAULT NULL COMMENT 'Max deal redemptions per month for users'`,
  `ALTER TABLE plans ADD COLUMN dealPriority INT DEFAULT 1 COMMENT 'Priority level for accessing deals (1=lowest, 5=highest)'`,
  `ALTER TABLE plans ADD COLUMN features_json JSON DEFAULT NULL COMMENT 'Detailed features as JSON'`,
  `ALTER TABLE plans ADD COLUMN isDefault TINYINT(1) DEFAULT 0 COMMENT 'Is this a default system plan'`,
  `ALTER TABLE plans ADD COLUMN planExpiry ENUM('monthly', 'yearly') DEFAULT 'yearly' COMMENT 'Plan billing cycle'`,
  `ALTER TABLE plans ADD COLUMN status ENUM('active', 'inactive', 'deprecated') DEFAULT 'active'`,
  `ALTER TABLE plans ADD COLUMN sortOrder INT DEFAULT 0 COMMENT 'Display order for plans'`,
  
  // Add missing columns to users table for enhanced plan tracking
  `ALTER TABLE users ADD COLUMN maxDealRedemptions INT DEFAULT NULL COMMENT 'Custom deal redemption limit for this user'`,
  `ALTER TABLE users ADD COLUMN dealsRedeemedThisMonth INT DEFAULT 0 COMMENT 'Deals redeemed this month by user'`,
  `ALTER TABLE users ADD COLUMN planExpiry ENUM('monthly', 'yearly') DEFAULT 'yearly' COMMENT 'User plan billing cycle'`,
  `ALTER TABLE users ADD COLUMN planStatus ENUM('active', 'expired', 'suspended') DEFAULT 'active' COMMENT 'Current plan status'`,
  
  // Add missing columns to businesses table for enhanced merchant plan tracking
  `ALTER TABLE businesses ADD COLUMN maxDealsPerMonth INT DEFAULT NULL COMMENT 'Custom monthly deal limit for this business'`,
  `ALTER TABLE businesses ADD COLUMN planExpiry ENUM('monthly', 'yearly') DEFAULT 'yearly' COMMENT 'Business plan billing cycle'`,
  
  // Add missing columns to deals table for plan priority access
  `ALTER TABLE deals ADD COLUMN minPlanPriority INT DEFAULT 1 COMMENT 'Minimum plan priority required to access this deal'`,
  `ALTER TABLE deals ADD COLUMN accessLevels JSON DEFAULT NULL COMMENT 'Plan keys that can access this deal'`,
  
  // Update existing plans table structure
  `UPDATE plans SET dealPriority = 1, sortOrder = 1 WHERE \`key\` = 'basic'`,
  `UPDATE plans SET dealPriority = 2, sortOrder = 2 WHERE \`key\` LIKE '%silver%'`,
  `UPDATE plans SET dealPriority = 3, sortOrder = 3 WHERE \`key\` LIKE '%gold%'`,
  `UPDATE plans SET dealPriority = 4, sortOrder = 4 WHERE \`key\` LIKE '%platinum%' AND \`key\` NOT LIKE '%plus%'`,
  `UPDATE plans SET dealPriority = 5, sortOrder = 5 WHERE \`key\` LIKE '%platinum_plus%'`,
  
  // Set default plans flag
  `UPDATE plans SET isDefault = 1 WHERE \`key\` IN ('basic', 'silver', 'gold', 'platinum', 'basic_business', 'silver_business', 'gold_business', 'platinum_business', 'platinum_plus_business')`,
];

// Create connection
const connection = mysql.createConnection(dbConfig);

console.log('🚀 Starting Enhanced Plan Management System Migration...\n');
connection.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err);
    return;
  }
  
  console.log('✅ Connected to database successfully!');
  console.log(`📋 Executing ${sqlCommands.length} migration commands...\n`);
  
  // Execute SQL commands one by one
  let completed = 0;
  const errors = [];
  
  sqlCommands.forEach((sql, index) => {
    connection.query(sql, (err, results) => {
      if (err) {
        // Ignore "duplicate column" errors
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column already exists: ${sql.split(' ')[5] || 'unknown'}`);
        } else if (err.code === 'ER_BAD_FIELD_ERROR') {
          console.log(`⚠️  Column doesn't exist (skipping): ${err.message}`);
        } else {
          console.error(`❌ Error executing SQL ${index + 1}:`, err.message);
          errors.push({ index: index + 1, error: err.message, sql: sql.substring(0, 50) + '...' });
        }
      } else {
        console.log(`✅ SQL ${index + 1} executed successfully: ${sql.substring(0, 50)}...`);
      }
      
      completed++;
      if (completed === sqlCommands.length) {
        console.log('\n🎉 Migration completed!');
        
        if (errors.length > 0) {
          console.log(`\n⚠️  ${errors.length} errors encountered:`);
          errors.forEach(error => {
            console.log(`   ${error.index}: ${error.error}`);
          });
        } else {
          console.log('✅ All commands executed successfully!');
        }
        
        // Verify the changes
        console.log('\n🔍 Verifying plan table structure...');
        connection.query('DESCRIBE plans', (err, results) => {
          if (err) {
            console.error('❌ Error verifying plans table:', err);
          } else {
            console.log('\n📊 PLANS TABLE STRUCTURE:');
            results.forEach(column => {
              console.log(`   ${column.Field} (${column.Type}) - Default: ${column.Default}`);
            });
          }
          connection.end();
        });
      }
    });
  });
});
