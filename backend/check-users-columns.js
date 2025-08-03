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
      console.log('Users table columns:');
      results.forEach(row => {
        console.log(`  ${row.Field} (${row.Type})`);
      });
    }
    connection.end();
  });
});
