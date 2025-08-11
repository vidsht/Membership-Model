const db = require('./db');

// Reset a merchant's business status to active
async function resetToActive() {
  const query = `UPDATE businesses SET status = 'active' WHERE businessId = (
    SELECT businessId FROM businesses WHERE userId = (
      SELECT id FROM users WHERE email = 'ka@example.com' LIMIT 1
    ) LIMIT 1
  )`;
  
  db.query(query, (err, result) => {
    if (err) {
      console.error('Error updating status:', err);
    } else {
      console.log('✅ Business status reset to active');
      console.log('Affected rows:', result.affectedRows);
    }
    process.exit();
  });
}

resetToActive();
