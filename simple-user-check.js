/**
 * Simple script to just check the users table structure and data
 */

require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function simpleUserCheck() {
  console.log('🔍 SIMPLE USER TABLE CHECK\n');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'community_app',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('✅ Connected to database');

    // Show full table structure
    console.log('\n1. Full users table structure:');
    const [columns] = await connection.execute('DESCRIBE users');
    columns.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Count total users
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`\n2. Total users: ${countResult[0].count}`);

    if (countResult[0].count > 0) {
      // Show first user's data
      console.log('\n3. Sample user data (first user):');
      const [firstUser] = await connection.execute('SELECT * FROM users LIMIT 1');
      if (firstUser.length > 0) {
        console.log(JSON.stringify(firstUser[0], null, 2));
      }

      // Check membership fields specifically
      console.log('\n4. Membership field analysis:');
      const [membershipData] = await connection.execute(`
        SELECT 
          id,
          membership,
          membershipType,
          planStatus
        FROM users 
        LIMIT 5
      `);
      
      membershipData.forEach((user, index) => {
        console.log(`   User ${user.id}:`);
        console.log(`     membership: "${user.membership}"`);
        console.log(`     membershipType: "${user.membershipType}"`);
        console.log(`     planStatus: "${user.planStatus}"`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

simpleUserCheck().catch(console.error);
