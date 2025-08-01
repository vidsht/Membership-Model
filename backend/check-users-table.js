const mysql = require('mysql2');
require('dotenv').config();

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
  
  connection.query('DESCRIBE users', (err, results) => {
    if (err) {
      console.error('Query failed:', err);
    } else {
      console.log('Current users table structure:');
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
