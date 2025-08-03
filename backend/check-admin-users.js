const db = require('./db');

console.log('Checking for admin users...');

db.query('SELECT id, email, userType FROM users WHERE userType = "admin" LIMIT 5', (err, results) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Admin users found:', results.length);
    console.log(results);
  }
  
  // Also check all user types
  db.query('SELECT userType, COUNT(*) as count FROM users GROUP BY userType', (err2, results2) => {
    if (err2) {
      console.error('Error getting user types:', err2);
    } else {
      console.log('\nUser type distribution:');
      results2.forEach(row => {
        console.log(`${row.userType}: ${row.count}`);
      });
    }
    process.exit();
  });
});
