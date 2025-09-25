// Migration script to add userCategory column
const db = require('./db');

const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

async function addUserCategoryColumn() {
  try {
    console.log('🔍 Checking for userCategory column...');
    
    // Check if userCategory column exists
    const columns = await queryAsync(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'userCategory'
    `);
    
    if (columns.length === 0) {
      console.log('➕ Adding userCategory column...');
      await queryAsync('ALTER TABLE users ADD COLUMN userCategory VARCHAR(100) DEFAULT NULL');
      console.log('✅ UserCategory column added successfully!');
      
      // Add some test data
      console.log('📝 Adding test userCategory data...');
      await queryAsync(`UPDATE users SET userCategory = 'Individual' WHERE userType = 'user' AND userCategory IS NULL LIMIT 5`);
      await queryAsync(`UPDATE users SET userCategory = 'Business Owner' WHERE userType = 'merchant' AND userCategory IS NULL LIMIT 3`);
      console.log('✅ Test data added successfully!');
    } else {
      console.log('✅ UserCategory column already exists');
    }
    
    // Show sample data
    const users = await queryAsync('SELECT id, fullName, userType, userCategory FROM users WHERE userCategory IS NOT NULL LIMIT 5');
    console.log('\n📊 Sample users with userCategory:');
    users.forEach(user => {
      console.log(`   ID: ${user.id}, Name: ${user.fullName}, Type: ${user.userType}, Category: ${user.userCategory}`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

addUserCategoryColumn();