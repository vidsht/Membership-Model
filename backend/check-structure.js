const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function checkStructure() {
  const connection = mysql.createConnection(dbConfig);
  
  try {
    console.log('Checking database structure...');
    
    // Check businesses table structure
    const [businessStructure] = await connection.promise().execute('DESCRIBE businesses');
    console.log('\n📋 Businesses table columns:');
    businessStructure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    connection.end();
  }
}

checkStructure();
