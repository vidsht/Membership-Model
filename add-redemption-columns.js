const mysql = require('mysql2/promise');

async function addRejectionReasonColumn() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Prachika01',
    database: 'membership_model'
  });

  try {
    console.log('Adding rejection_reason column to deal_redemptions table...');
    
    await db.execute(`
      ALTER TABLE deal_redemptions 
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
    `);
    
    console.log('✅ Successfully added rejection_reason and updated_at columns');
    
    // Check current table structure
    const [columns] = await db.execute('DESCRIBE deal_redemptions');
    console.log('\n📋 Current table structure:');
    console.table(columns);

  } catch (error) {
    console.error('❌ Error updating table:', error);
  } finally {
    await db.end();
  }
}

addRejectionReasonColumn();
