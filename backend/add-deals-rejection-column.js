const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect((err) => {
  if (err) {
    console.error('Connection failed:', err);
    return;
  }
  
  // Check if rejection_reason column exists
  connection.query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'deals' 
    AND COLUMN_NAME = 'rejection_reason'
  `, (err, results) => {
    if (err) {
      console.error('Query failed:', err);
      connection.end();
      return;
    }
    
    if (results.length === 0) {
      console.log('Adding rejection_reason column to deals table...');
      
      // Add the column
      connection.query(`
        ALTER TABLE deals 
        ADD COLUMN rejection_reason TEXT NULL 
        AFTER status
      `, (err, result) => {
        if (err) {
          console.error('❌ Error adding column:', err);
        } else {
          console.log('✅ rejection_reason column added successfully');
        }
        
        // Show current deals table structure
        connection.query('DESCRIBE deals', (err, results) => {
          if (err) {
            console.error('Error describing table:', err);
          } else {
            console.log('\nCurrent deals table structure:');
            console.log('Field               | Type            | Null  | Default');
            console.log('------------------------------------------------------------');
            results.forEach(row => {
              const field = row.Field.padEnd(18);
              const type = row.Type.padEnd(14);
              const nullable = row.Null.padEnd(5);
              const defaultVal = row.Default || 'NULL';
              console.log(`${field} | ${type} | ${nullable} | ${defaultVal}`);
            });
          }
          connection.end();
        });
      });
    } else {
      console.log('✅ rejection_reason column already exists');
      connection.end();
    }
  });
});
