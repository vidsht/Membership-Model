const db = require('./backend/db.js');

console.log('Checking database for merchants...');

db.query('SELECT id, email, businessName FROM users WHERE role = "merchant" LIMIT 5', (err, results) => {
  if (err) {
    console.error('Database error:', err);
  } else {
    console.log('Merchants found:', results);
  }
  process.exit();
});
