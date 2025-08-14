const db = require('./backend/db'); // Use existing connection

async function addBloodGroupColumn() {
  try {
    console.log('Connected to MySQL database');

    // Add blood group column
    db.query(`
      ALTER TABLE users 
      ADD COLUMN bloodGroup VARCHAR(10) DEFAULT NULL 
      AFTER dob
    `, (error, results) => {
      if (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('ℹ️  bloodGroup column already exists');
        } else {
          console.error('Error adding bloodGroup column:', error.message);
          return;
        }
      } else {
        console.log('✅ Added bloodGroup column to users table');
      }

      // Add index for better performance
      db.query(`
        CREATE INDEX idx_users_bloodGroup ON users(bloodGroup)
      `, (indexError, indexResults) => {
        if (indexError) {
          if (indexError.code === 'ER_DUP_KEYNAME') {
            console.log('ℹ️  bloodGroup index already exists');
          } else {
            console.error('Error creating bloodGroup index:', indexError.message);
          }
        } else {
          console.log('✅ Created index for bloodGroup column');
        }
        
        console.log('Database update completed successfully');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Error updating database:', error.message);
    process.exit(1);
  }
}

addBloodGroupColumn();
