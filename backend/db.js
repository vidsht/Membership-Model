const mysql = require('mysql2');
require('dotenv').config();

// Use a connection pool for robust, concurrent MySQL access
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  idleTimeout: 300000,        // 5 minutes
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
  // Enhanced timeout settings to handle connection issues
  connectTimeout: 60000,      // 60 seconds
  acquireTimeout: 60000,      // 60 seconds
  timeout: 60000,             // 60 seconds
  reconnect: true,
  // Additional settings for better connection stability
  ssl: false,
  multipleStatements: false,
  charset: 'utf8mb4'
});

// Add global error handler for pool
pool.on('connection', function (connection) {
  console.log('New MySQL connection established with ID:', connection.threadId);
});

pool.on('error', function(err) {
  console.error('MySQL pool error:', err);
  if(err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('MySQL connection lost, attempting to reconnect...');
  } else {
    throw err;
  }
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
