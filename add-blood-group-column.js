const mysql = require('mysql2/promise');

async function addBloodGroupColumn() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_model'
    });

    // Check if bloodGroup column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_model' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'bloodGroup'
    `);

    if (columns.length > 0) {
      console.log('bloodGroup column already exists in users table');
      return;
    }

    // Add bloodGroup column to users table
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN bloodGroup VARCHAR(5) DEFAULT NULL 
      COMMENT 'Blood group of the user (A+, B+, O+, AB+, A-, B-, O-, AB-)'
    `);

    console.log('Successfully added bloodGroup column to users table');

    // Verify the column was added
    const [newColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'membership_model' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'bloodGroup'
    `);

    if (newColumns.length > 0) {
      console.log('Column details:', newColumns[0]);
    }

  } catch (error) {
    console.error('Error adding bloodGroup column:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addBloodGroupColumn();
