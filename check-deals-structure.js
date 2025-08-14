const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function checkDealsStructure() {
  console.log('=== Checking Deals Table Structure ===\n');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: false
  });
  
  try {
    console.log('✅ Connected to database');
    
    // Check current deals table structure
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'deals' 
      AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);
    
    console.log('Current deals table columns:');
    columns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (nullable: ${col.IS_NULLABLE}, default: ${col.COLUMN_DEFAULT})`);
    });
    
    // Check if rejection_reason column exists
    const hasRejectionReason = columns.find(col => col.COLUMN_NAME === 'rejection_reason');
    console.log(`\nRejection reason column exists: ${hasRejectionReason ? 'YES' : 'NO'}`);
    
    // Check plans table structure for dynamic access levels
    const [planColumns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'plans' 
      AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);
    
    console.log('\nCurrent plans table columns:');
    planColumns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
    });
    
    // Get current plans to understand structure
    const [plans] = await connection.query('SELECT id, name, `key`, priority, dealAccess FROM plans ORDER BY priority');
    console.log('\nCurrent plans:');
    plans.forEach(plan => {
      console.log(`- ${plan.name} (key: ${plan.key}, priority: ${plan.priority}, dealAccess: ${plan.dealAccess})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed');
  }
}

checkDealsStructure();
