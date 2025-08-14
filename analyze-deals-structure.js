const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function analyzeDealTableStructure() {
  console.log('=== Analyzing Deals Table Structure ===\n');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: false
  });
  
  try {
    console.log('✅ Connected to database');
    
    // 1. Check deals table structure with focus on access control columns
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'deals' 
      AND TABLE_SCHEMA = ?
      AND (COLUMN_NAME LIKE '%access%' OR COLUMN_NAME LIKE '%plan%' OR COLUMN_NAME LIKE '%priority%')
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);
    
    console.log('Access control related columns in deals table:');
    columns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (default: ${col.COLUMN_DEFAULT}, nullable: ${col.IS_NULLABLE})`);
      if (col.COLUMN_COMMENT) {
        console.log(`  Comment: ${col.COLUMN_COMMENT}`);
      }
    });
    
    // 2. Check sample deals data
    const [deals] = await connection.query(`
      SELECT id, title, status, accessLevel, requiredPlanPriority, minPlanPriority
      FROM deals 
      WHERE status IN ('active', 'pending_approval')
      LIMIT 10
    `);
    
    console.log('\nSample deals data:');
    deals.forEach(deal => {
      console.log(`- Deal ${deal.id}: "${deal.title}"`);
      console.log(`  Status: ${deal.status}`);
      console.log(`  accessLevel: ${deal.accessLevel}`);
      console.log(`  requiredPlanPriority: ${deal.requiredPlanPriority}`);
      console.log(`  minPlanPriority: ${deal.minPlanPriority}`);
      console.log('');
    });
    
    // 3. Check plans table for reference
    const [plans] = await connection.query(`
      SELECT id, name, \`key\`, priority, type, isActive
      FROM plans 
      WHERE isActive = 1 AND type = 'user'
      ORDER BY priority ASC
    `);
    
    console.log('Available user plans (for access control):');
    plans.forEach(plan => {
      console.log(`- ${plan.name} (key: ${plan.key}, priority: ${plan.priority})`);
    });
    
    // 4. Analyze the relationship issue
    console.log('\n=== ANALYSIS ===');
    console.log('🔍 Issue Analysis:');
    console.log('1. Admin selects "Gold plan" but display shows "For basic Members & Above"');
    console.log('2. This suggests frontend is reading accessLevel instead of requiredPlanPriority');
    console.log('3. Need to update frontend to use requiredPlanPriority for dynamic plan display');
    
    console.log('\n📊 Current Data Analysis:');
    if (deals.length > 0) {
      const withAccessLevel = deals.filter(d => d.accessLevel);
      const withRequiredPriority = deals.filter(d => d.requiredPlanPriority !== null);
      const withMinPriority = deals.filter(d => d.minPlanPriority !== null);
      
      console.log(`- Deals with accessLevel: ${withAccessLevel.length}`);
      console.log(`- Deals with requiredPlanPriority: ${withRequiredPriority.length}`);
      console.log(`- Deals with minPlanPriority: ${withMinPriority.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed');
  }
}

analyzeDealTableStructure();
