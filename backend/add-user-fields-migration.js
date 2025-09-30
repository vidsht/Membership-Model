const mysql = require('mysql2');
require('dotenv').config();

// Database connection with error handling
let db;
try {
  db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000
  });
} catch (err) {
  console.error('❌ Database connection setup failed:', err);
  process.exit(1);
}

// Function to check if column exists
function checkColumnExists(tableName, columnName) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = ? 
      AND COLUMN_NAME = ?
    `;
    
    db.query(query, [process.env.DB_NAME, tableName, columnName], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results[0].count > 0);
      }
    });
  });
}

// Function to add column if it doesn't exist
async function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  try {
    const exists = await checkColumnExists(tableName, columnName);
    
    if (exists) {
      console.log(`✅ Column ${columnName} already exists in ${tableName}`);
      return true;
    }
    
    console.log(`📝 Adding ${columnName} column to ${tableName}...`);
    
    const alterQuery = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`;
    
    return new Promise((resolve, reject) => {
      db.query(alterQuery, (err, results) => {
        if (err) {
          console.error(`❌ Error adding ${columnName} column:`, err);
          reject(err);
        } else {
          console.log(`✅ Successfully added ${columnName} column to ${tableName}`);
          resolve(true);
        }
      });
    });
    
  } catch (error) {
    console.error(`❌ Failed to add ${columnName} column:`, error);
    return false;
  }
}

// Main migration function
async function runMigration() {
  try {
    console.log('🔍 Starting migration check...');
    
    // Test connection first
    await new Promise((resolve, reject) => {
      db.connect((err) => {
        if (err) {
          console.error('❌ Database connection failed:', err);
          reject(err);
        } else {
          console.log('✅ Connected to database');
          resolve();
        }
      });
    });
    
    // Add employer_name column
    await addColumnIfNotExists('users', 'employer_name', 'VARCHAR(255) NULL');
    
    // Add years_in_ghana column  
    await addColumnIfNotExists('users', 'years_in_ghana', 'INT NULL');
    
    console.log('🎉 Migration completed successfully');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    
    // If connection failed, just log that the columns might need to be added manually
    console.log('\n📋 If database is not accessible, please run these SQL commands manually:');
    console.log('ALTER TABLE users ADD COLUMN employer_name VARCHAR(255) NULL;');
    console.log('ALTER TABLE users ADD COLUMN years_in_ghana INT NULL;');
  } finally {
    if (db && db.end) {
      db.end();
    }
  }
}

// Run the migration
runMigration();