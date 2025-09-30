const mysql = require('mysql2');
require('dotenv').config();

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

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

// Function to add years_in_ghana column
async function addYearsInGhanaColumn() {
  try {
    console.log('🔍 Checking if years_in_ghana column exists...');
    
    const columnExists = await checkColumnExists('users', 'years_in_ghana');
    
    if (columnExists) {
      console.log('✅ years_in_ghana column already exists');
      return;
    }
    
    console.log('📝 Adding years_in_ghana column to users table...');
    
    const alterQuery = `
      ALTER TABLE users 
      ADD COLUMN years_in_ghana INT NULL 
      AFTER employer_name
    `;
    
    db.query(alterQuery, (err, results) => {
      if (err) {
        console.error('❌ Error adding years_in_ghana column:', err);
        throw err;
      }
      
      console.log('✅ Successfully added years_in_ghana column to users table');
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
addYearsInGhanaColumn()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    db.end();
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    db.end();
    process.exit(1);
  });