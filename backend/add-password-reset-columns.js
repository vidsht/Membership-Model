const db = require('./db');

async function addResetTokenColumns() {
  console.log('🔄 Adding password reset token columns to users table...');

  try {
    // Check if columns already exist
    const checkQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('resetToken', 'resetTokenExpiry')
      AND TABLE_SCHEMA = DATABASE()
    `;
    
    const result = await new Promise((resolve, reject) => {
      db.query(checkQuery, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    const existingColumns = result.map(row => row.COLUMN_NAME);
    
    if (!existingColumns.includes('resetToken')) {
      console.log('📋 Adding resetToken column...');
      await new Promise((resolve, reject) => {
        db.query(
          'ALTER TABLE users ADD COLUMN resetToken VARCHAR(255) NULL',
          (err, results) => {
            if (err) reject(err);
            else resolve(results);
          }
        );
      });
      console.log('✅ resetToken column added successfully');
    }

    if (!existingColumns.includes('resetTokenExpiry')) {
      console.log('📋 Adding resetTokenExpiry column...');
      await new Promise((resolve, reject) => {
        db.query(
          'ALTER TABLE users ADD COLUMN resetTokenExpiry DATETIME NULL',
          (err, results) => {
            if (err) reject(err);
            else resolve(results);
          }
        );
      });
      console.log('✅ resetTokenExpiry column added successfully');
    }

    if (existingColumns.includes('resetToken') && existingColumns.includes('resetTokenExpiry')) {
      console.log('✅ Password reset columns already exist');
    }

    console.log('🎉 Password reset token migration completed successfully');

  } catch (error) {
    console.error('❌ Error adding password reset columns:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addResetTokenColumns()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addResetTokenColumns;
