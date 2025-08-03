const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'u214148440_membership01'
});

async function runColumnFixes() {
  console.log('🔧 Running database column fixes...\n');

  try {
    // Check current column names
    console.log('1. Checking current table structure...');
    
    const [columns] = await db.promise().query(`
      SHOW COLUMNS FROM deal_redemptions LIKE '%_id'
    `);
    
    console.log('Current columns:', columns.map(col => col.Field));

    if (columns.some(col => col.Field === 'deal_id')) {
      console.log('✅ Database has snake_case columns (deal_id, user_id)');
      console.log('   Backend queries should use snake_case column names');
      console.log('   No database changes needed - the current setup is correct');
    } else {
      console.log('⚠️  Database may have camelCase columns');
      console.log('   Need to check if migration was already applied');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Database connection failed. Make sure MySQL is running.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Database not found. Check database name in connection.');
    }
  } finally {
    db.end();
  }
}

runColumnFixes();
