const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function addMaxRedemptionsColumn() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Adding maxRedemptions column to plans table...');

    // Check if column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'plans' AND COLUMN_NAME = 'maxRedemptions'
    `);

    if (columns.length === 0) {
      // Add the column
      await connection.execute(`
        ALTER TABLE plans 
        ADD COLUMN maxRedemptions INT DEFAULT NULL 
        COMMENT 'Maximum redemptions per month for user plans (-1 for unlimited)'
      `);
      console.log('✅ maxRedemptions column added successfully');
    } else {
      console.log('⚠️ maxRedemptions column already exists');
    }

    connection.end();
  } catch (error) {
    console.error('❌ Error adding maxRedemptions column:', error);
  }
}

addMaxRedemptionsColumn();
