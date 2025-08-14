const mysql = require('mysql2/promise');

async function fixDealStatusEnum() {
  console.log('=== Fixing Deals Status Enum Directly ===\n');
  
  // Create connection using the same settings as the app
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Adjust if you have a password
    database: 'membership_system'
  });
  
  try {
    // Check current enum values
    console.log('1. Checking current enum values...');
    const [tableInfo] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'deals' 
      AND COLUMN_NAME = 'status' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    console.log('Current status column definition:', tableInfo[0]?.COLUMN_TYPE);
    
    // Check current deal statuses
    const [currentDeals] = await connection.query('SELECT id, title, status FROM deals LIMIT 10');
    console.log('\nCurrent deals and their statuses:');
    currentDeals.forEach(deal => {
      console.log(`- Deal ${deal.id}: "${deal.title}" - Status: ${deal.status}`);
    });
    
    // Update the enum to include pending_approval and rejected
    console.log('\n2. Updating enum to include pending_approval and rejected...');
    
    const alterQuery = `
      ALTER TABLE deals 
      MODIFY COLUMN status ENUM('active', 'inactive', 'expired', 'scheduled', 'pending_approval', 'rejected') 
      DEFAULT 'pending_approval'
    `;
    
    await connection.query(alterQuery);
    console.log('✅ Successfully updated status enum!');
    
    // Verify the change
    console.log('\n3. Verifying the enum update...');
    const [newTableInfo] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'deals' 
      AND COLUMN_NAME = 'status' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    console.log('New status column definition:', newTableInfo[0]?.COLUMN_TYPE);
    
    // Test inserting a deal with pending_approval status
    console.log('\n4. Testing pending_approval status insertion...');
    
    const testDealData = {
      businessId: 1,
      title: 'Test Deal - Enum Fix',
      description: 'Testing if pending_approval status works now',
      category: 'food',
      originalPrice: 100.00,
      discountedPrice: 70.00,
      discount: '30',
      discountType: 'percentage',
      requiredPlanPriority: 1,
      termsConditions: 'Test terms',
      expirationDate: '2025-12-31',
      status: 'pending_approval'
    };
    
    const insertQuery = `
      INSERT INTO deals (
        businessId, title, description, category, originalPrice, discountedPrice, 
        discount, discountType, requiredPlanPriority, termsConditions, 
        expirationDate, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const [insertResult] = await connection.query(insertQuery, [
      testDealData.businessId,
      testDealData.title,
      testDealData.description,
      testDealData.category,
      testDealData.originalPrice,
      testDealData.discountedPrice,
      testDealData.discount,
      testDealData.discountType,
      testDealData.requiredPlanPriority,
      testDealData.termsConditions,
      testDealData.expirationDate,
      testDealData.status
    ]);
    
    console.log(`✅ Test deal inserted with ID: ${insertResult.insertId}`);
    
    // Verify the inserted deal
    const [verifyDeal] = await connection.query(
      'SELECT id, title, status FROM deals WHERE id = ?', 
      [insertResult.insertId]
    );
    
    if (verifyDeal.length > 0) {
      console.log(`✅ Verified: Deal ${verifyDeal[0].id} has status: ${verifyDeal[0].status}`);
      
      if (verifyDeal[0].status === 'pending_approval') {
        console.log('\n🎉 SUCCESS! Enum fix is complete and working!');
        console.log('✅ Merchants can now create deals with pending_approval status');
        console.log('✅ Admin approval workflow will work correctly');
      } else {
        console.log(`❌ Status mismatch: expected 'pending_approval', got '${verifyDeal[0].status}'`);
      }
    }
    
    // Clean up test deal
    await connection.query('DELETE FROM deals WHERE id = ?', [insertResult.insertId]);
    console.log('\n🧹 Cleaned up test deal');
    
  } catch (error) {
    console.error('❌ Error fixing enum:', error.message);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed');
  }
}

fixDealStatusEnum();
