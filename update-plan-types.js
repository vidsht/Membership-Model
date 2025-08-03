const db = require('./backend/db');

db.query('UPDATE plans SET type = "membership" WHERE type = "user"', (err, result) => {
  if (err) {
    console.error('Error updating plans:', err);
  } else {
    console.log('✅ Updated', result.affectedRows, 'plans to membership type');
  }
  db.end();
});
