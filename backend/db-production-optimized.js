const mysql = require('mysql2');
require('dotenv').config();

// Production-optimized connection pool configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // Enhanced connection pool settings for production
  waitForConnections: true,
  connectionLimit: 50,            // Increased from 20 for higher load
  queueLimit: 0,                  // Unlimited queue
  idleTimeout: 180000,            // 3 minutes (reduced from 5)
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
  
  // Production timeout settings
  connectTimeout: 30000,          // Reduced to 30 seconds for faster failover
  acquireTimeout: 30000,          // Reduced to 30 seconds
  timeout: 120000,                // Increased query timeout to 2 minutes
  
  // Connection reliability settings
  reconnect: true,
  ssl: false,
  multipleStatements: false,
  charset: 'utf8mb4',
  
  // Additional production optimizations
  maxReconnects: 3,               // Limit reconnection attempts
  reconnectDelay: 2000,           // 2 second delay between reconnects
  
  // Connection validation
  pingInterval: 60000,            // Ping every minute to keep connections alive
  restartNodeAfterTimeout: 5000,  // Restart after 5 seconds of inactivity
});

// Enhanced error handling with retry logic
pool.on('connection', function (connection) {
  console.log(`✅ New MySQL connection established with ID: ${connection.threadId}`);
  
  // Set connection-specific timeouts
  connection.query('SET SESSION wait_timeout = 300');
  connection.query('SET SESSION interactive_timeout = 300');
});

pool.on('acquire', function (connection) {
  console.log(`🔗 Connection ${connection.threadId} acquired from pool`);
});

pool.on('release', function (connection) {
  console.log(`🔓 Connection ${connection.threadId} released back to pool`);
});

pool.on('error', function(err) {
  console.error('❌ MySQL pool error:', err);
  
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 MySQL connection lost, pool will handle reconnection...');
  } else if (err.code === 'ECONNREFUSED') {
    console.error('💀 MySQL server refused connection - check server status');
  } else if (err.code === 'ETIMEDOUT') {
    console.error('⏱️ MySQL connection timed out - check network and server load');
  } else if (err.code === 'ENOTFOUND') {
    console.error('🔍 MySQL host not found - check DNS resolution and host configuration');
  } else {
    console.error('🚨 Unexpected MySQL error:', err.code, err.message);
  }
});

// Enhanced connection test with retry logic
function testConnection(retries = 3) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error(`❌ MySQL connection failed (attempt ${4 - retries}/3):`, err.message);
        
        if (retries > 1) {
          console.log(`🔄 Retrying connection in 2 seconds...`);
          setTimeout(() => {
            testConnection(retries - 1)
              .then(resolve)
              .catch(reject);
          }, 2000);
        } else {
          console.error('💀 All connection attempts failed. Please check:');
          console.error('   1. Database server is running');
          console.error('   2. Network connectivity to host:', process.env.DB_HOST);
          console.error('   3. Database credentials in .env file');
          console.error('   4. Firewall settings');
          reject(err);
        }
      } else {
        console.log('✅ Connected to MySQL Database successfully');
        console.log(`📊 Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
        connection.release();
        resolve();
      }
    });
  });
}

// Test connection on startup
testConnection()
  .then(() => {
    console.log('🚀 Database connection pool initialized successfully');
  })
  .catch((err) => {
    console.error('💥 Failed to initialize database connection pool');
    process.exit(1);
  });

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, closing MySQL connection pool...');
  pool.end(() => {
    console.log('✅ MySQL connection pool closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, closing MySQL connection pool...');
  pool.end(() => {
    console.log('✅ MySQL connection pool closed');
    process.exit(0);
  });
});

module.exports = pool;