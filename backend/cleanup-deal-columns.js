const db = require('./db');

async function cleanupDealColumns() {
  try {
    console.log('Cleaning up unnecessary deal table columns...');
    
    const columnsToRemove = [
      'accessLevel',
      'accessLevels', 
      'maxRedemptions'
    ];
    
    for (const column of columnsToRemove) {
      try {
        await new Promise((resolve, reject) => {
          // First check if column exists
          db.query(`SHOW COLUMNS FROM deals LIKE '${column}'`, (err, result) => {
            if (err) {
              reject(err);
            } else if (result.length > 0) {
              // Column exists, drop it
              db.query(`ALTER TABLE deals DROP COLUMN ${column}`, (dropErr) => {
                if (dropErr) {
                  console.log(`⚠️  Could not remove ${column}: ${dropErr.message}`);
                } else {
                  console.log(`✅ Removed column: ${column}`);
                }
                resolve();
              });
            } else {
              console.log(`ℹ️  Column ${column} does not exist`);
              resolve();
            }
          });
        });
      } catch (error) {
        console.log(`⚠️  Error processing ${column}: ${error.message}`);
      }
    }
    
    // Verify final table structure
    console.log('\nFinal deals table structure:');
    db.query('DESCRIBE deals', (err, result) => {
      if (err) {
        console.error('Error:', err);
      } else {
        result.forEach(r => console.log(`- ${r.Field} (${r.Type})`));
      }
      process.exit();
    });
    
  } catch (error) {
    console.error('Error cleaning up columns:', error);
    process.exit(1);
  }
}

cleanupDealColumns();
