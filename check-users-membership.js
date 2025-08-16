/**
 * Check the users table to see what membershipType values exist
 * This will help us understand the current state of user data
 */

require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function checkUsersTable() {
  console.log('🔍 CHECKING USERS TABLE DATA\n');

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

    // Check table structure
    console.log('\n1. Users table structure:');
    const [columns] = await connection.execute('DESCRIBE users');
    columns.forEach(col => {
      if (col.Field.includes('member') || col.Field.includes('plan')) {
        console.log(`   📋 ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
      }
    });

    // Check existing users and their membership data
    console.log('\n2. Sample user membership data:');
    const [users] = await connection.execute(`
      SELECT 
        id,
        firstName,
        lastName,
        email,
        membershipType,
        membership,
        created_at
      FROM users 
      WHERE membershipType IS NOT NULL OR membership IS NOT NULL
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    if (users.length === 0) {
      console.log('   ❌ No users found with membership data');
      
      // Check if there are any users at all
      const [allUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log(`   📊 Total users in database: ${allUsers[0].count}`);
      
      if (allUsers[0].count > 0) {
        console.log('\n   Sample users (first 3):');
        const [sampleUsers] = await connection.execute('SELECT id, firstName, lastName, email, membershipType, membership FROM users LIMIT 3');
        sampleUsers.forEach((user, index) => {
          const name = `${user.firstName} ${user.lastName}`.trim();
          console.log(`   User ${index + 1}: ${name} (${user.email})`);
          console.log(`      membershipType: "${user.membershipType}"`);
          console.log(`      membership: "${user.membership}"`);
        });
      }
    } else {
      console.log(`   ✅ Found ${users.length} users with membership data:`);
      users.forEach((user, index) => {
        const name = `${user.firstName} ${user.lastName}`.trim();
        console.log(`   ${index + 1}. ${name} (${user.email})`);
        console.log(`      membershipType: "${user.membershipType}"`);
        console.log(`      membership: "${user.membership}"`);
      });
    }

    // Check membership type distribution
    console.log('\n3. Membership type distribution:');
    const [distribution] = await connection.execute(`
      SELECT 
        COALESCE(membershipType, membership, 'no_membership') as membership_value,
        COUNT(*) as count
      FROM users 
      GROUP BY COALESCE(membershipType, membership, 'no_membership')
      ORDER BY count DESC
    `);

    if (distribution.length === 0) {
      console.log('   ❌ No membership data found');
    } else {
      distribution.forEach(item => {
        console.log(`   📊 ${item.membership_value}: ${item.count} users`);
      });
    }

    // Check plans table for reference
    console.log('\n4. Available plans for reference:');
    try {
      const [plans] = await connection.execute(`
        SELECT 
          id,
          name,
          \`key\`,
          priority,
          type
        FROM plans 
        WHERE type = 'user'
        ORDER BY priority ASC
      `);
      
      if (plans.length === 0) {
        console.log('   ❌ No user plans found in plans table');
      } else {
        plans.forEach(plan => {
          console.log(`   📋 ${plan.name} (key: "${plan.key}", priority: ${plan.priority})`);
        });
      }
    } catch (error) {
      console.log('   ❌ Error reading plans table:', error.message);
    }

    console.log('\n5. Diagnosis:');
    if (users.length === 0) {
      console.log('   🔧 ISSUE: No users have membershipType values');
      console.log('   💡 SOLUTIONS:');
      console.log('      a) Create test users with membershipType values');
      console.log('      b) Update existing users to have proper membershipType');
      console.log('      c) Check user registration process to ensure membershipType is set');
    } else {
      console.log('   ✅ Users have membershipType values');
      console.log('   🔍 Next: Test login with one of these users to verify auth fix');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main execution
checkUsersTable().catch(console.error);
