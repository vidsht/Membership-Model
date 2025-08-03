const db = require('./db');

console.log('🔍 Checking if users table needs validation date column...\n');

// Check if validationDate column exists
db.query('SHOW COLUMNS FROM users LIKE "validationDate"', (err, results) => {
  if (err) {
    console.error('❌ Error checking validationDate column:', err);
    process.exit(1);
  }
  
  if (results.length === 0) {
    console.log('❌ validationDate column missing, adding it...');
    
    // Add validationDate column for plan expiry
    db.query('ALTER TABLE users ADD COLUMN validationDate DATE', (err) => {
      if (err) {
        console.error('❌ Error adding validationDate column:', err);
      } else {
        console.log('✅ validationDate column added successfully');
        
        // Update existing users with validation dates based on their plan
        db.query(`
          UPDATE users 
          SET validationDate = DATE_ADD(COALESCE(planAssignedAt, created_at, NOW()), INTERVAL 1 YEAR)
          WHERE validationDate IS NULL AND membershipType IS NOT NULL
        `, (err, result) => {
          if (err) {
            console.error('❌ Error updating validation dates:', err);
          } else {
            console.log(`✅ Updated validation dates for ${result.affectedRows} users`);
          }
          process.exit(0);
        });
      }
    });
  } else {
    console.log('✅ validationDate column already exists');
    process.exit(0);
  }
});
