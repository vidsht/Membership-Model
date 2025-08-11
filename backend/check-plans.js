const db = require('./db');

db.query('SELECT * FROM plans WHERE type = "merchant" AND isActive = 1', (err, results) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Merchant plans:', results);
  }
  process.exit();
});
