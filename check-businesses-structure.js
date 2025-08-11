const db = require('./backend/db');

db.query('DESCRIBE businesses', (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Businesses table columns:');
    result.forEach(r => console.log(`- ${r.Field} (${r.Type})`));
  }
  process.exit();
});
