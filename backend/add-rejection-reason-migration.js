const mysql = require('mysql2/promise');

async function addRejectionReasonColumn() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_db'
  });

  try {
    // Check if column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_db' 
      AND TABLE_NAME = 'deals' 
      AND COLUMN_NAME = 'rejection_reason'
    `);

    if (columns.length === 0) {
      console.log('Adding rejection_reason column to deals table...');
      
      // Add the column
      await connection.execute(`
        ALTER TABLE deals 
        ADD COLUMN rejection_reason TEXT NULL 
        AFTER status
      `);
      
      console.log('✅ rejection_reason column added successfully');
    } else {
      console.log('✅ rejection_reason column already exists');
    }

    // Check for existing deals with status for verification
    const [deals] = await connection.execute(`
      SELECT id, title, status, rejection_reason 
      FROM deals 
      LIMIT 5
    `);
    
    console.log('Sample deals with new schema:');
    console.table(deals);

  } catch (error) {
    console.error('❌ Error adding rejection_reason column:', error);
  } finally {
    await connection.end();
  }
}

addRejectionReasonColumn();
