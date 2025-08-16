const mysql = require('mysql2');
require('dotenv').config();

// Create connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'membership_db'
});

// Utility function to promisify db.query
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

async function analyzeRedemptionWorkflow() {
  try {
    console.log('🔍 ANALYZING REDEMPTION WORKFLOW\n');

    // 1. Check deal_redemptions table structure
    console.log('1. Checking deal_redemptions table schema...');
    const schema = await queryAsync('DESCRIBE deal_redemptions');
    console.table(schema);

    const hasRejectionReason = schema.some(col => col.Field === 'rejection_reason');
    const hasStatus = schema.some(col => col.Field === 'status');
    
    console.log(`\n📊 Schema Analysis:`);
    console.log(`✅ status column exists: ${hasStatus}`);
    console.log(`${hasRejectionReason ? '✅' : '❌'} rejection_reason column exists: ${hasRejectionReason}`);

    // 2. Check current redemption data
    console.log('\n2. Checking current redemption data...');
    const redemptions = await queryAsync(`
      SELECT 
        dr.id, dr.status, dr.rejection_reason, dr.redeemed_at,
        d.title as deal_title,
        u.fullName as user_name
      FROM deal_redemptions dr
      JOIN deals d ON dr.deal_id = d.id
      JOIN users u ON dr.user_id = u.id
      ORDER BY dr.redeemed_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${redemptions.length} recent redemptions:`);
    if (redemptions.length > 0) {
      console.table(redemptions);
    }

    // 3. Check for inconsistencies
    console.log('\n3. Checking for workflow inconsistencies...');
    
    const statusCount = await queryAsync(`
      SELECT status, COUNT(*) as count
      FROM deal_redemptions
      GROUP BY status
    `);
    
    console.log('Status distribution:');
    console.table(statusCount);

    // 4. Add rejection_reason column if missing
    if (!hasRejectionReason) {
      console.log('\n🔧 FIXING: Adding rejection_reason column...');
      await queryAsync(`
        ALTER TABLE deal_redemptions 
        ADD COLUMN rejection_reason TEXT NULL AFTER status
      `);
      console.log('✅ rejection_reason column added successfully');
    }

    // 5. Check merchant dashboard query
    console.log('\n4. Testing merchant dashboard queries...');
    
    const pendingRequests = await queryAsync(`
      SELECT dr.*, u.phone, u.membershipNumber, d.title as dealTitle, d.discount, d.discountType,
             u.fullName as userName
      FROM deal_redemptions dr
      JOIN deals d ON dr.deal_id = d.id
      JOIN users u ON dr.user_id = u.id
      WHERE dr.status = 'pending'
      ORDER BY dr.redeemed_at DESC
      LIMIT 5
    `);
    
    console.log(`Found ${pendingRequests.length} pending requests:`);
    if (pendingRequests.length > 0) {
      console.table(pendingRequests.map(r => ({
        id: r.id,
        dealTitle: r.dealTitle,
        userName: r.userName,
        phone: r.phone,
        status: r.status,
        redeemed_at: r.redeemed_at
      })));
    }

    const approvedRequests = await queryAsync(`
      SELECT dr.*, u.phone, u.membershipNumber, d.title as dealTitle, d.discount, d.discountType,
             u.fullName as userName
      FROM deal_redemptions dr
      JOIN deals d ON dr.deal_id = d.id
      JOIN users u ON dr.user_id = u.id
      WHERE dr.status = 'approved'
      ORDER BY dr.redeemed_at DESC
      LIMIT 5
    `);
    
    console.log(`\nFound ${approvedRequests.length} approved requests:`);
    if (approvedRequests.length > 0) {
      console.table(approvedRequests.map(r => ({
        id: r.id,
        dealTitle: r.dealTitle,
        userName: r.userName,
        phone: r.phone,
        status: r.status,
        redeemed_at: r.redeemed_at
      })));
    }

    console.log('\n✅ ANALYSIS COMPLETE');
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('1. ✅ Ensure redemptions are created with status="pending"');
    console.log('2. ✅ Merchant dashboard should show pending requests for approval');
    console.log('3. ✅ Only approved requests should count toward deal redemption totals');
    console.log('4. ✅ Rejected requests should store rejection_reason');

  } catch (error) {
    console.error('❌ Error analyzing redemption workflow:', error);
  } finally {
    db.end();
    process.exit(0);
  }
}

analyzeRedemptionWorkflow();
