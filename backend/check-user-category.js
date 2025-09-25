const db = require('./db');

const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

(async () => {
  try {
    console.log('Checking userCategory column in users table...');
    
    // Check if userCategory column exists
    const columns = await queryAsync(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'userCategory'
    `);
    
    console.log('UserCategory column exists:', columns.length > 0);
    
    if (columns.length === 0) {
      console.log('UserCategory column does not exist. Adding it...');
      await queryAsync('ALTER TABLE users ADD COLUMN userCategory VARCHAR(100) DEFAULT NULL');
      console.log('UserCategory column added successfully!');
    }
    
    // Get sample users with userCategory
    const users = await queryAsync('SELECT id, fullName, userCategory FROM users LIMIT 5');
    console.log('\nSample users userCategory data:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.fullName}, Category: ${user.userCategory || 'NULL'}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();