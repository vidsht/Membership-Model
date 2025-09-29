const mysql = require('mysql2');
require('dotenv').config();

// Optimized connection pool for 1000-2000 users
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  // Optimized for high concurrency (1000-2000 users)
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 100,  // Increased from 20
  queueLimit: 0,
  idleTimeout: 300000,        // 5 minutes
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
  // Optimized timeout settings for production load
  connectTimeout: 30000,      // 30 seconds (reduced for faster failover)
  acquireTimeout: 30000,      // 30 seconds
  timeout: 30000,             // 30 seconds (faster query timeout)
  reconnect: true,
  // Additional settings for better connection stability
  ssl: false,
  multipleStatements: false,
  charset: 'utf8mb4',
  // Performance optimizations
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
  // Connection pool optimization
  removeNodeErrorCount: 5,
  restoreNodeTimeout: 0,
  // Query cache optimization (if supported by hosting)
  flags: '-FOUND_ROWS'
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
