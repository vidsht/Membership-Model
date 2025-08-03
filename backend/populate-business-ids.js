const mysql = require('mysql2');
require('dotenv').config();

// Use the same database configuration from db.js
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function populateBusinessIds() {
  const connection = mysql.createConnection(dbConfig);
  
  try {
    console.log('Populating businessId in users table...');
    
    // Update users table with businessId from businesses table
    const updateQuery = `
      UPDATE users u 
      JOIN businesses b ON u.id = b.userId 
      SET u.businessId = b.businessId 
      WHERE u.userType = 'merchant' AND u.businessId IS NULL
    `;
    
    const [result] = await connection.promise().execute(updateQuery);
    console.log(`✅ Updated ${result.affectedRows} user records with businessId`);
    
    // Check the current state
    const checkQuery = `
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN businessId IS NOT NULL THEN 1 ELSE 0 END) as withBusinessId
      FROM users 
      WHERE userType = 'merchant'
    `;
    
    const [rows] = await connection.promise().execute(checkQuery);
    const stats = rows[0];
    console.log(`📊 Merchant users: ${stats.total}, with businessId: ${stats.withBusinessId}`);
    
  } catch (error) {
    console.error('Error populating businessIds:', error);
  } finally {
    connection.end();
  }
}

populateBusinessIds();
