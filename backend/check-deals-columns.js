const db = require('./db');

db.query('DESCRIBE deals', (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Deals table columns:');
    result.forEach(r => console.log(`- ${r.Field} (${r.Type})`));
  }
  process.exit();
});
