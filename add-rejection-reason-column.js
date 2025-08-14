const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function addRejectionReasonColumn() {
  console.log('=== Adding Rejection Reason Column ===\n');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: false
  });
  
  try {
    console.log('✅ Connected to database');
    
    // Check if rejection_reason column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'deals' 
      AND COLUMN_NAME = 'rejection_reason'
      AND TABLE_SCHEMA = ?
    `, [process.env.DB_NAME]);
    
    if (columns.length > 0) {
      console.log('✅ rejection_reason column already exists');
      return;
    }
    
    // Add rejection_reason column
    console.log('Adding rejection_reason column...');
    await connection.query(`
      ALTER TABLE deals 
      ADD COLUMN rejection_reason TEXT NULL 
      COMMENT 'Reason provided by admin when rejecting a deal'
    `);
    
    console.log('✅ rejection_reason column added successfully');
    
    // Verify the column was added
    const [newColumns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'deals' 
      AND COLUMN_NAME = 'rejection_reason'
      AND TABLE_SCHEMA = ?
    `, [process.env.DB_NAME]);
    
    if (newColumns.length > 0) {
      console.log('✅ Verified: rejection_reason column details:');
      console.log(`   Type: ${newColumns[0].COLUMN_TYPE}`);
      console.log(`   Nullable: ${newColumns[0].IS_NULLABLE}`);
      console.log(`   Comment: ${newColumns[0].COLUMN_COMMENT}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed');
  }
}

addRejectionReasonColumn();
