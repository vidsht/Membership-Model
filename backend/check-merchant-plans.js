const db = require('./db');

// Check current merchant plans and their priorities
db.query('SELECT * FROM plans WHERE type = "merchant" ORDER BY priority', (err, results) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Current Merchant Plans:');
    console.table(results);
  }
  process.exit();
});
