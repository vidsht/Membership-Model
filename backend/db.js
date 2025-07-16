const mysql = require('mysql2');
require('dotenv').config();

// Use a connection pool for robust, concurrent MySQL access
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err.stack);
  } else {
    console.log('✅ Connected to Hostinger MySQL Database');
    connection.release();
  }
});

module.exports = pool;
