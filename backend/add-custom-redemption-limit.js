const db = require('./db');

console.log('🔄 Adding customRedemptionLimit column to users table...');

// Check if the column already exists
const checkColumnQuery = `
  SELECT COLUMN_NAME 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'customRedemptionLimit'
`;

db.query(checkColumnQuery, (err, results) => {
  if (err) {
    console.error('❌ Error checking column existence:', err);
    process.exit(1);
  }

  if (results.length > 0) {
    console.log('✅ customRedemptionLimit column already exists');
    
    // Check some sample data
    db.query('SELECT id, fullName, customRedemptionLimit FROM users LIMIT 3', (err, users) => {
      if (err) {
        console.error('❌ Error selecting users:', err);
      } else {
        console.log('📋 Sample user data:');
        console.table(users);
      }
      process.exit(0);
    });
  } else {
    console.log('➕ Adding customRedemptionLimit column...');
    
    const addColumnQuery = `
      ALTER TABLE users 
      ADD COLUMN customRedemptionLimit INT NULL DEFAULT NULL 
      COMMENT 'Custom redemption limit set by admin. NULL means use plan default, -1 means unlimited'
    `;
    
    db.query(addColumnQuery, (err, result) => {
      if (err) {
        console.error('❌ Error adding column:', err);
        process.exit(1);
      }
      
      console.log('✅ customRedemptionLimit column added successfully');
      
      // Verify the column was added
      db.query('DESCRIBE users', (err, columns) => {
        if (err) {
          console.error('❌ Error describing table:', err);
          process.exit(1);
        }
        
        const redemptionColumn = columns.find(col => col.Field === 'customRedemptionLimit');
        if (redemptionColumn) {
          console.log('✅ Column verified:');
          console.table([redemptionColumn]);
        }
        
        process.exit(0);
      });
    });
  }
});
