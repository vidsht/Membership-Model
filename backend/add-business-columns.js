const db = require('./db');

console.log('Adding missing columns to businesses table...');

// Add missing columns
db.query('ALTER TABLE businesses ADD COLUMN businessWebsite VARCHAR(255)', (err) => {
  if (err && !err.message.includes('Duplicate column')) {
    console.error('Error adding businessWebsite:', err.message);
  } else {
    console.log('✅ businessWebsite column added');
  }
  
  db.query('ALTER TABLE businesses ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', (err) => {
    if (err && !err.message.includes('Duplicate column')) {
      console.error('Error adding updated_at:', err.message);
    } else {
      console.log('✅ updated_at column added');
    }
    
    console.log('✅ Businesses table updated successfully');
    process.exit(0);
  });
});
