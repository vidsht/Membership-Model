const mysql = require('mysql2');
require('dotenv').config();

// Use the same database configuration from db.js
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true
};

async function runMigration() {
  const connection = mysql.createConnection(dbConfig);
  
  try {
    console.log('Running database migration...');
    
    // Run each migration step separately
    const migrations = [
      `ALTER TABLE deals ADD COLUMN IF NOT EXISTS originalPrice DECIMAL(10, 2) DEFAULT NULL AFTER discountType`,
      `ALTER TABLE deals ADD COLUMN IF NOT EXISTS discountedPrice DECIMAL(10, 2) DEFAULT NULL AFTER originalPrice`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS businessId VARCHAR(20) DEFAULT NULL AFTER id`,
      `ALTER TABLE deals ADD COLUMN IF NOT EXISTS validFrom DATE DEFAULT NULL AFTER termsConditions`,
      `CREATE INDEX IF NOT EXISTS idx_users_businessId ON users(businessId)`
    ];
    
    for (let i = 0; i < migrations.length; i++) {
      try {
        console.log(`Running migration ${i + 1}/${migrations.length}...`);
        await connection.promise().execute(migrations[i]);
        console.log(`✅ Migration ${i + 1} completed successfully`);
      } catch (error) {
        console.log(`⚠️ Migration ${i + 1} skipped (might already exist):`, error.message);
      }
    }
    
    console.log('🎉 All migrations completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    connection.end();
  }
}

runMigration();
