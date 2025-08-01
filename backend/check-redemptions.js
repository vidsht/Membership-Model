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
  
  // Check if deal_redemptions table exists and what columns it has
  connection.query('DESCRIBE deal_redemptions', (err, results) => {
    if (err) {
      console.error('deal_redemptions table error:', err);
      console.log('Table might not exist, checking available tables...');
      
      connection.query('SHOW TABLES LIKE "%redemption%"', (err2, tables) => {
        if (err2) {
          console.error('Show tables failed:', err2);
        } else {
          console.log('Tables with redemption:', tables);
        }
        connection.end();
      });
    } else {
      console.log('deal_redemptions table structure:');
      results.forEach(row => console.log(row.Field, row.Type));
      connection.end();
    }
  });
});
