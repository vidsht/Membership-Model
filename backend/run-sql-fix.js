const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'auth-db1388.hstgr.io',
  user: 'u214148440_SachinHursale',
  password: 'Membership@2025',
  database: 'u214148440_membership01',
  multipleStatements: true
};

// Read the SQL file
const sqlFile = path.join(__dirname, '../database_column_fixes_simple.sql');
const sqlCommands = fs.readFileSync(sqlFile, 'utf8');

// Create connection
const connection = mysql.createConnection(dbConfig);

console.log('Connecting to database...');
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  
  console.log('Connected to database successfully!');
  
  // Execute SQL commands
  console.log('Executing SQL commands...');
  connection.query(sqlCommands, (err, results) => {
    if (err) {
      console.error('Error executing SQL:', err);
    } else {
      console.log('SQL commands executed successfully!');
      console.log('Results:', results);
    }
    
    // Close connection
    connection.end((err) => {
      if (err) {
        console.error('Error closing connection:', err);
      } else {
        console.log('Database connection closed.');
      }
    });
  });
});
