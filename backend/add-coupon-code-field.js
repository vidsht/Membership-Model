const db = require('./db');

// Function to add couponCode field to deals table
async function addCouponCodeField() {
  try {
    console.log('🔍 Checking if couponCode column exists in deals table...');
    
    // Check if column exists
    const checkColumnQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'deals' 
      AND COLUMN_NAME = 'couponCode'
    `;
    
    const columnExists = await new Promise((resolve, reject) => {
      db.query(checkColumnQuery, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results.length > 0);
        }
      });
    });

    if (columnExists) {
      console.log('✅ couponCode column already exists in deals table');
      return;
    }

    console.log('❌ couponCode column does not exist. Adding it...');

    // Add couponCode column
    const addColumnQuery = `
      ALTER TABLE deals 
      ADD COLUMN couponCode VARCHAR(50) NULL 
      AFTER termsConditions
    `;

    await new Promise((resolve, reject) => {
      db.query(addColumnQuery, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    console.log('✅ couponCode column added successfully to deals table');

    // Update some existing deals with sample coupon codes
    const updateQuery = `
      UPDATE deals 
      SET couponCode = CONCAT('DEAL', LPAD(id, 3, '0')) 
      WHERE couponCode IS NULL 
      AND status = 'active' 
      LIMIT 10
    `;

    const updateResult = await new Promise((resolve, reject) => {
      db.query(updateQuery, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    console.log(`✅ Updated ${updateResult.affectedRows} deals with sample coupon codes`);

  } catch (error) {
    console.error('❌ Error adding couponCode field:', error);
  } finally {
    // Close database connection
    if (db && db.end) {
      db.end();
    }
    process.exit(0);
  }
}

// Run the migration
addCouponCodeField();
