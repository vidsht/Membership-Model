const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',  // Update with your MySQL password
  database: 'indians_ghana_membership',
  multipleStatements: true
};

async function runMigration() {
  const connection = mysql.createConnection(dbConfig);
  
  try {
    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'fix_deal_management_db.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Running database migration...');
    
    // Execute the migration
    const [results] = await connection.promise().execute(sql);
    console.log('Migration completed successfully:', results);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    connection.end();
  }
}

runMigration();
