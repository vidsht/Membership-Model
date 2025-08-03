const db = require('./db');

db.query('SELECT id, name, type, priority, isActive FROM plans WHERE type = "user"', (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('User plans in database:');
    console.log(JSON.stringify(result, null, 2));
  }
  process.exit();
});
