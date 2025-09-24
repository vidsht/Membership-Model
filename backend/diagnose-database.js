#!/usr/bin/env node

const mysql = require('mysql2');
require('dotenv').config();

console.log('🔍 Database Connection Diagnostic Tool');
console.log('=====================================\n');

// Test different connection configurations
const configurations = [
  {
    name: 'Environment Variables',
    config: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    }
  },
  {
    name: 'Production IP Direct',
    config: {
      host: '82.197.82.19',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: 3306
    }
  },
  {
    name: 'Development Hostname',
    config: {
      host: 'auth-db1388.hstgr.io',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: 3306
    }
  }
];

async function testConnection(name, config) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const connection = mysql.createConnection({
      ...config,
      connectTimeout: 10000,
      acquireTimeout: 10000,
      timeout: 10000
    });

    const timeout = setTimeout(() => {
      connection.destroy();
      console.log(`   ❌ TIMEOUT after 10 seconds`);
      resolve({ success: false, error: 'TIMEOUT', duration: 10000 });
    }, 10000);

    connection.connect((err) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      
      if (err) {
        console.log(`   ❌ FAILED: ${err.code} - ${err.message} (${duration}ms)`);
        connection.destroy();
        resolve({ success: false, error: err.code, duration, message: err.message });
      } else {
        console.log(`   ✅ SUCCESS (${duration}ms)`);
        
        // Test a simple query
        connection.query('SELECT 1 as test, NOW() as server_time', (queryErr, results) => {
          const queryDuration = Date.now() - startTime;
          
          if (queryErr) {
            console.log(`   ❌ Query failed: ${queryErr.message}`);
            connection.end();
            resolve({ success: false, error: 'QUERY_FAILED', duration: queryDuration });
          } else {
            console.log(`   ✅ Query successful (${queryDuration}ms)`);
            console.log(`   📅 Server time: ${results[0].server_time}`);
            connection.end();
            resolve({ success: true, duration: queryDuration, serverTime: results[0].server_time });
          }
        });
      }
    });
  });
}

async function checkDNSResolution() {
  console.log('\n🌐 DNS Resolution Test');
  console.log('=====================');
  
  const dns = require('dns');
  const { promisify } = require('util');
  const lookup = promisify(dns.lookup);
  
  const hosts = [
    process.env.DB_HOST,
    'auth-db1388.hstgr.io'
  ].filter(Boolean);
  
  for (const host of hosts) {
    try {
      console.log(`\n🔍 Resolving: ${host}`);
      const result = await lookup(host);
      console.log(`   ✅ Resolved to: ${result.address} (${result.family === 4 ? 'IPv4' : 'IPv6'})`);
    } catch (error) {
      console.log(`   ❌ DNS resolution failed: ${error.message}`);
    }
  }
}

async function checkEnvironmentVariables() {
  console.log('\n⚙️ Environment Variables');
  console.log('========================');
  
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      // Mask password for security
      const displayValue = varName === 'DB_PASSWORD' ? '***HIDDEN***' : value;
      console.log(`   ✅ ${varName}: ${displayValue}`);
    } else {
      console.log(`   ❌ ${varName}: NOT SET`);
    }
  }
  
  console.log(`   📍 DB_PORT: ${process.env.DB_PORT || '3306 (default)'}`);
}

async function runDiagnostics() {
  console.log(`🕐 Started at: ${new Date().toISOString()}\n`);
  
  // Check environment variables
  await checkEnvironmentVariables();
  
  // Check DNS resolution
  await checkDNSResolution();
  
  // Test connections
  console.log('\n🔌 Connection Tests');
  console.log('==================');
  
  const results = [];
  
  for (const { name, config } of configurations) {
    const result = await testConnection(name, config);
    results.push({ name, ...result });
  }
  
  // Summary
  console.log('\n📊 Summary');
  console.log('==========');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful connections: ${successful.length}`);
  console.log(`❌ Failed connections: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 Working configurations:');
    successful.forEach(r => {
      console.log(`   - ${r.name} (${r.duration}ms)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n💥 Failed configurations:');
    failed.forEach(r => {
      console.log(`   - ${r.name}: ${r.error} ${r.message ? `(${r.message})` : ''}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 Recommendations');
  console.log('==================');
  
  if (failed.some(r => r.error === 'ETIMEDOUT')) {
    console.log('⏱️ Timeout issues detected:');
    console.log('   - Check network connectivity');
    console.log('   - Verify firewall settings');
    console.log('   - Consider increasing timeout values');
  }
  
  if (failed.some(r => r.error === 'ENOTFOUND')) {
    console.log('🔍 DNS resolution issues detected:');
    console.log('   - Verify database hostname spelling');
    console.log('   - Check DNS server configuration');
    console.log('   - Consider using IP address directly');
  }
  
  if (failed.some(r => r.error === 'ECONNREFUSED')) {
    console.log('🚫 Connection refused:');
    console.log('   - Database server may be down');
    console.log('   - Check port number (default: 3306)');
    console.log('   - Verify firewall allows connections');
  }
  
  if (failed.some(r => r.error === 'ER_ACCESS_DENIED_ERROR')) {
    console.log('🔐 Authentication issues:');
    console.log('   - Verify username and password');
    console.log('   - Check user permissions');
  }
  
  console.log(`\n✅ Diagnostics completed at: ${new Date().toISOString()}`);
}

// Run diagnostics
runDiagnostics().catch(console.error);