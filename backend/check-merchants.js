const db = require('./db');

db.query('SELECT u.id, u.fullName, u.email, u.userType, u.status, b.businessName, b.currentPlan FROM users u LEFT JOIN businesses b ON u.id = b.userId WHERE u.userType = "merchant" LIMIT 5', (err, results) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Sample merchants:', results);
  }
  process.exit();
});
