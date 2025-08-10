// Check admin users in database
const mysql = require('mysql2');

// Try to load dotenv if available
try {
  require('dotenv').config();
} catch (e) {
  console.log('Note: dotenv not available, using default values');
}

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'indians_in_ghana'
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    return;
  }
  console.log('✅ Connected to MySQL database');
});

// Check for admin users
function checkAdminUsers() {
  const query = 'SELECT id, fullName, email, userType FROM users WHERE userType = "admin" LIMIT 5';
  
  connection.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error checking admin users:', err);
      return;
    }
    
    console.log('\n📋 Admin Users Found:');
    if (results.length === 0) {
      console.log('❌ No admin users found in database!');
      console.log('\n💡 You need to create an admin user. You can:');
      console.log('1. Update an existing user: UPDATE users SET userType = "admin" WHERE email = "your-email@example.com"');
      console.log('2. Or create a new admin user through the registration process and then update their userType');
    } else {
      results.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}, Name: ${user.fullName}, Email: ${user.email}, Type: ${user.userType}`);
      });
    }
    
    connection.end();
  });
}

// Check for tables existence
function checkTables() {
  const tables = ['users', 'plans', 'deals', 'businesses', 'settings'];
  
  console.log('\n🔍 Checking database tables...');
  
  tables.forEach(tableName => {
    connection.query(`SHOW TABLES LIKE '${tableName}'`, (err, results) => {
      if (err) {
        console.error(`❌ Error checking table ${tableName}:`, err);
      } else if (results.length > 0) {
        console.log(`✅ Table '${tableName}' exists`);
      } else {
        console.log(`❌ Table '${tableName}' does not exist`);
      }
    });
  });
}

// Run checks
console.log('🔍 Starting database checks...\n');
checkTables();
setTimeout(() => {
  checkAdminUsers();
}, 1000);
