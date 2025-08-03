const db = require('./db');

console.log('🔍 Checking database structure...\n');

// Check if plans table exists
db.query('SHOW TABLES LIKE "plans"', (err, results) => {
  if (err) {
    console.error('❌ Error checking plans table:', err);
  } else {
    console.log('✅ Plans table exists:', results.length > 0);
    
    if (results.length > 0) {
      // Check plans table structure
      db.query('DESCRIBE plans', (err, results) => {
        if (err) {
          console.error('❌ Error describing plans table:', err);
        } else {
          console.log('📋 Plans table structure:');
          console.table(results);
        }
        
        // Check plans table data
        db.query('SELECT * FROM plans LIMIT 5', (err, results) => {
          if (err) {
            console.error('❌ Error querying plans table:', err);
          } else {
            console.log('📊 Plans table data:');
            console.table(results);
          }
          
          // Check all tables
          db.query('SHOW TABLES', (err, results) => {
            if (err) {
              console.error('❌ Error showing tables:', err);
            } else {
              console.log('🗂️ All tables in database:');
              results.forEach(row => {
                console.log(' -', Object.values(row)[0]);
              });
            }
            process.exit(0);
          });
        });
      });
    } else {
      console.log('ℹ️ Plans table does not exist');
      process.exit(0);
    }
  }
});
