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
  queueLimit: 0,
  idleTimeout: 600000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('Please check your database credentials in .env file');
    process.exit(1);
  } else {
    console.log('✅ Connected to MySQL Database successfully');
    connection.release();
  }
});

module.exports = pool;
