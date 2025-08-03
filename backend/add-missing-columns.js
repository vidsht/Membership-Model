const mysql = require('mysql2');
const fs = require('fs');

// Database configuration
const dbConfig = {
  host: 'auth-db1388.hstgr.io',
  user: 'u214148440_SachinHursale',
  password: 'Membership@2025',
  database: 'u214148440_membership01'
};

// SQL commands to add missing columns
const sqlCommands = [
  // Add missing columns to users table if they don't exist
  `ALTER TABLE users ADD COLUMN community VARCHAR(100) DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN country VARCHAR(100) DEFAULT 'Ghana'`,
  `ALTER TABLE users ADD COLUMN state VARCHAR(100) DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN city VARCHAR(100) DEFAULT NULL`,
  
  // Add missing columns to deals table
  `ALTER TABLE deals ADD COLUMN requiredPlanLevel JSON DEFAULT NULL`,
  
  // Update existing deals to have default access level
  `UPDATE deals SET requiredPlanLevel = JSON_ARRAY('basic', 'silver', 'gold') WHERE requiredPlanLevel IS NULL`,
];

// Create connection
const connection = mysql.createConnection(dbConfig);

console.log('Connecting to database...');
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  
  console.log('Connected to database successfully!');
  
  // Execute SQL commands one by one
  let completed = 0;
  sqlCommands.forEach((sql, index) => {
    connection.query(sql, (err, results) => {
      if (err) {
        // Ignore "duplicate column" errors
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column already exists: ${sql.split(' ')[5]}`);
        } else {
          console.error(`Error executing SQL ${index + 1}:`, err.message);
        }
      } else {
        console.log(`SQL ${index + 1} executed successfully:`, sql.substring(0, 50) + '...');
      }
      
      completed++;
      if (completed === sqlCommands.length) {
        console.log('All database updates completed!');
        connection.end();
      }
    });
  });
});
