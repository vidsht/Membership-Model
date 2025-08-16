/**
 * Check plans table to understand the correct plan structure
 */

require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql2/promise');

async function checkPlansTable() {
  console.log('🔍 CHECKING PLANS TABLE\n');

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

    // Show all user plans
    console.log('\n1. All user plans:');
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
      console.log('   ❌ No user plans found');
    } else {
      plans.forEach(plan => {
        console.log(`   📋 ${plan.name} (key: "${plan.key}", priority: ${plan.priority})`);
      });
    }

    // Show user membership types and see which plans they should map to
    console.log('\n2. User membershipType values:');
    const [membershipTypes] = await connection.execute(`
      SELECT DISTINCT membershipType, COUNT(*) as count
      FROM users 
      WHERE membershipType IS NOT NULL
      GROUP BY membershipType
    `);
    
    membershipTypes.forEach(item => {
      console.log(`   👤 "${item.membershipType}": ${item.count} users`);
    });

    console.log('\n3. Problem analysis:');
    console.log('   🔍 User membershipType values vs Plan keys:');
    
    membershipTypes.forEach(userType => {
      const matchingPlan = plans.find(plan => 
        plan.key === userType.membershipType || 
        plan.name.toLowerCase().includes(userType.membershipType.toLowerCase()) ||
        userType.membershipType.toLowerCase().includes(plan.key.toLowerCase())
      );
      
      if (matchingPlan) {
        console.log(`   ✅ "${userType.membershipType}" → matches plan "${matchingPlan.key}" (${matchingPlan.name})`);
      } else {
        console.log(`   ❌ "${userType.membershipType}" → NO MATCHING PLAN FOUND!`);
      }
    });

    console.log('\n4. Recommended solution:');
    console.log('   🔧 We have two options:');
    console.log('   A) Update membershipType values to match plan keys exactly');
    console.log('   B) Modify the frontend canRedeem function to handle fuzzy matching');
    console.log('   C) Create a mapping function in the backend');
    
    console.log('\n5. Current plan keys that should work:');
    plans.forEach(plan => {
      console.log(`   📌 "${plan.key}"`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkPlansTable().catch(console.error);
