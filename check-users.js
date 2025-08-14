const axios = require('axios');

async function checkMerchants() {
  try {
    console.log('=== Checking Available Users ===\n');
    
    // First, try to get all users to see what's available
    const response = await axios.get('http://localhost:5001/api/users', {
      timeout: 10000
    });
    
    console.log('Available users:', response.data);
    
    if (response.data.users) {
      console.log('\nMerchants found:');
      const merchants = response.data.users.filter(user => user.userType === 'merchant');
      merchants.forEach(merchant => {
        console.log(`- Email: ${merchant.email}, Type: ${merchant.userType}`);
      });
      
      console.log('\nAdmins found:');
      const admins = response.data.users.filter(user => user.userType === 'admin');
      admins.forEach(admin => {
        console.log(`- Email: ${admin.email}, Type: ${admin.userType}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to get users:', error.response?.data || error.message);
    
    // Try a simple merchant deal creation test with a default account
    console.log('\n=== Attempting Database Enum Test ===');
    console.log('Testing if we can create a deal with pending_approval status...');
    
    // Create a simple SQL test script
    console.log('Recommendation: Use SQL directly to test the enum');
    console.log('Run this SQL to test:');
    console.log(`
-- Test the current enum values
SHOW COLUMNS FROM deals LIKE 'status';

-- Try to insert with pending_approval (this should fail if enum is not updated)
INSERT INTO deals (businessId, title, description, category, originalPrice, discountedPrice, discount, discountType, requiredPlanPriority, termsConditions, expirationDate, status, createdAt, updatedAt) 
VALUES (1, 'Test Deal', 'Test Description', 'food', 100.00, 70.00, '30', 'percentage', 1, 'Test terms', '2025-12-31', 'pending_approval', NOW(), NOW());
    `);
  }
}

checkMerchants();
