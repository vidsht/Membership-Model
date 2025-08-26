const mysql = require('mysql2');

// Database configuration (match the .env settings)
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'mansi123',
  database: 'indian_membership_system',
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

console.log('🔄 Connecting to database...');

const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Connected to database');
  
  // Check if column exists
  const checkQuery = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = ? 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'customRedemptionLimit'
  `;
  
  connection.query(checkQuery, [dbConfig.database], (err, results) => {
    if (err) {
      console.error('❌ Error checking column:', err);
      connection.end();
      process.exit(1);
    }
    
    if (results.length > 0) {
      console.log('✅ customRedemptionLimit column already exists');
      
      // Show some sample data
      connection.query('SELECT id, fullName, customRedemptionLimit FROM users LIMIT 3', (err, users) => {
        if (err) {
          console.error('❌ Error selecting users:', err);
        } else {
          console.log('📋 Sample user data:');
          console.table(users);
        }
        connection.end();
        process.exit(0);
      });
    } else {
      console.log('➕ Adding customRedemptionLimit column...');
      
      const addColumnQuery = `
        ALTER TABLE users 
        ADD COLUMN customRedemptionLimit INT NULL DEFAULT NULL 
        COMMENT 'Custom redemption limit set by admin. NULL means use plan default, -1 means unlimited'
      `;
      
      connection.query(addColumnQuery, (err) => {
        if (err) {
          console.error('❌ Error adding column:', err);
          connection.end();
          process.exit(1);
        }
        
        console.log('✅ customRedemptionLimit column added successfully');
        
        // Verify
        connection.query('DESCRIBE users', (err, columns) => {
          if (err) {
            console.error('❌ Error describing table:', err);
          } else {
            const redemptionColumn = columns.find(col => col.Field === 'customRedemptionLimit');
            if (redemptionColumn) {
              console.log('✅ Column verified:');
              console.table([redemptionColumn]);
            }
          }
          connection.end();
          process.exit(0);
        });
      });
    }
  });
});
