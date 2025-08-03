const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function fixAllColumnIssues() {
  const connection = mysql.createConnection(dbConfig);
  
  try {
    console.log('🔧 Fixing all database column issues...\n');
    
    // Step 1: Ensure all required columns exist in deals table
    console.log('📋 Step 1: Adding missing columns to deals table...');
    const dealsMigrations = [
      `ALTER TABLE deals ADD COLUMN IF NOT EXISTS originalPrice DECIMAL(10, 2) DEFAULT NULL`,
      `ALTER TABLE deals ADD COLUMN IF NOT EXISTS discountedPrice DECIMAL(10, 2) DEFAULT NULL`,
      `ALTER TABLE deals ADD COLUMN IF NOT EXISTS validFrom DATE DEFAULT NULL`,
      `ALTER TABLE deals ADD COLUMN IF NOT EXISTS validUntil DATE DEFAULT NULL`,
      `ALTER TABLE deals ADD COLUMN IF NOT EXISTS maxRedemptions INT DEFAULT NULL`,
      `ALTER TABLE deals ADD COLUMN IF NOT EXISTS status ENUM('active','inactive','expired','scheduled') DEFAULT 'active'`
    ];
    
    for (const migration of dealsMigrations) {
      try {
        await connection.promise().execute(migration);
        console.log('✅ Column added/verified');
      } catch (error) {
        if (error.message.includes('Duplicate column')) {
          console.log('ℹ️ Column already exists');
        } else {
          console.log('⚠️ Migration note:', error.message);
        }
      }
    }
    
    // Step 2: Ensure users table has businessId column
    console.log('\n📋 Step 2: Adding businessId to users table...');
    try {
      await connection.promise().execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS businessId VARCHAR(20) DEFAULT NULL`);
      console.log('✅ businessId column added/verified');
    } catch (error) {
      console.log('⚠️ businessId migration note:', error.message);
    }
    
    // Step 3: Populate businessId in users table from businesses table
    console.log('\n📋 Step 3: Populating businessId in users table...');
    try {
      const [result] = await connection.promise().execute(`
        UPDATE users u 
        JOIN businesses b ON u.id = b.userId 
        SET u.businessId = b.businessId 
        WHERE u.userType = 'merchant' AND u.businessId IS NULL
      `);
      console.log(`✅ Updated ${result.affectedRows} user records with businessId`);
    } catch (error) {
      console.log('⚠️ businessId population note:', error.message);
    }
    
    // Step 4: Migrate existing date data
    console.log('\n📋 Step 4: Migrating existing date data...');
    try {
      await connection.promise().execute(`
        UPDATE deals 
        SET validUntil = expiration_date 
        WHERE validUntil IS NULL AND expiration_date IS NOT NULL
      `);
      
      await connection.promise().execute(`
        UPDATE deals 
        SET validFrom = startDate 
        WHERE validFrom IS NULL AND startDate IS NOT NULL
      `);
      console.log('✅ Date migration completed');
    } catch (error) {
      console.log('⚠️ Date migration note:', error.message);
    }
    
    // Step 5: Add indexes for better performance
    console.log('\n📋 Step 5: Adding database indexes...');
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_users_businessId ON users(businessId)`,
      `CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status)`,
      `CREATE INDEX IF NOT EXISTS idx_deals_validUntil ON deals(validUntil)`,
      `CREATE INDEX IF NOT EXISTS idx_deals_businessId ON deals(businessId)`
    ];
    
    for (const index of indexes) {
      try {
        await connection.promise().execute(index);
        console.log('✅ Index added/verified');
      } catch (error) {
        if (error.message.includes('Duplicate key')) {
          console.log('ℹ️ Index already exists');
        } else {
          console.log('⚠️ Index note:', error.message);
        }
      }
    }
    
    // Step 6: Verify final state
    console.log('\n📊 Step 6: Verifying database state...');
    
    // Check deals table structure
    const [dealsStructure] = await connection.promise().execute('DESCRIBE deals');
    const dealsColumns = dealsStructure.map(col => col.Field);
    console.log('📋 Deals table columns:', dealsColumns.join(', '));
    
    // Check sample data
    const [sampleDeals] = await connection.promise().execute(
      'SELECT id, title, originalPrice, discountedPrice, validFrom, validUntil, status FROM deals LIMIT 3'
    );
    console.log('📋 Sample deals data:');
    sampleDeals.forEach(deal => {
      console.log(`  Deal ${deal.id}: ${deal.title} (${deal.status})`);
    });
    
    // Check users with businessId
    const [businessUsers] = await connection.promise().execute(
      `SELECT COUNT(*) as total, SUM(CASE WHEN businessId IS NOT NULL THEN 1 ELSE 0 END) as withBusinessId 
       FROM users WHERE userType = 'merchant'`
    );
    console.log(`📊 Merchant users: ${businessUsers[0].total}, with businessId: ${businessUsers[0].withBusinessId}`);
    
    console.log('\n🎉 All database fixes completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database fixes:', error);
  } finally {
    connection.end();
  }
}

fixAllColumnIssues();
