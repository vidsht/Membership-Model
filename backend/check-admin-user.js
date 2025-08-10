const db = require('./db');

console.log('🔍 Checking users table structure...');

db.query('DESCRIBE users', (err, results) => {
  if (err) {
    console.error('❌ Error describing users table:', err);
    process.exit(1);
  }
  
  console.log('� Users table structure:');
  console.table(results);
  
  // Check for admin users
  db.query('SELECT id, email, userType FROM users WHERE userType = "admin" LIMIT 5', (err2, adminResults) => {
    if (err2) {
      console.error('❌ Error querying admin users:', err2);
    } else {
      console.log('\n👤 Admin users:');
      console.table(adminResults);
    }
    process.exit();
  });
});
