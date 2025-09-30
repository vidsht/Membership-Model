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

// Function to add employer_name column
async function addEmployerNameColumn() {
  try {
    console.log('🔍 Checking if employer_name column exists...');
    
    const columnExists = await checkColumnExists('users', 'employer_name');
    
    if (columnExists) {
      console.log('✅ employer_name column already exists');
      return;
    }
    
    console.log('📝 Adding employer_name column to users table...');
    
    const alterQuery = `
      ALTER TABLE users 
      ADD COLUMN employer_name VARCHAR(255) NULL 
      AFTER bloodGroup
    `;
    
    db.query(alterQuery, (err, results) => {
      if (err) {
        console.error('❌ Error adding employer_name column:', err);
        throw err;
      }
      
      console.log('✅ Successfully added employer_name column to users table');
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
addEmployerNameColumn()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    db.end();
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    db.end();
    process.exit(1);
  });