const mysql = require('mysql2');
require('dotenv').config();

// Create connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Promisify query
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

async function convertUserToMerchant() {
  try {
    console.log('🔧 CONVERTING USER TO MERCHANT\n');

    // Show current non-merchant users
    const regularUsers = await queryAsync(`
      SELECT id, fullName, email, userType, status, membershipType
      FROM users 
      WHERE userType = 'user' AND status = 'approved'
      ORDER BY created_at DESC
    `);

    if (regularUsers.length === 0) {
      console.log('ℹ️ No regular users found to convert');
      return;
    }

    console.log('📋 Available users to convert to merchants:');
    console.table(regularUsers);

    // For this example, let's convert the most recent user (ID 126 - Vidushi Tiwari)
    const userToConvert = regularUsers.find(u => u.id === 126);
    
    if (!userToConvert) {
      console.log('❌ User ID 126 not found or not eligible');
      return;
    }

    console.log(`\n🎯 Converting user: ${userToConvert.fullName} (${userToConvert.email})`);

    // Generate business ID
    const businessId = 'BIZ' + Math.floor(Math.random() * 1000000).toString().padStart(9, '0');

    // 1. Update user to merchant type
    await queryAsync(`
      UPDATE users 
      SET userType = 'merchant',
          membershipType = 'basic',
          updated_at = NOW()
      WHERE id = ?
    `, [userToConvert.id]);

    console.log('✅ 1. Updated user type to merchant');

    // 2. Create business record
    await queryAsync(`
      INSERT INTO businesses (
        businessId, businessName, businessDescription, businessCategory,
        businessAddress, businessPhone, businessEmail, 
        userId, isVerified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
    `, [
      businessId,
      `${userToConvert.fullName}'s Business`, // businessName
      'Business description not provided', // businessDescription  
      'general', // businessCategory
      'Address not provided', // businessAddress
      'Phone not provided', // businessPhone
      userToConvert.email, // businessEmail
      userToConvert.id // userId
    ]);

    console.log('✅ 2. Created business record with ID:', businessId);

    // 3. Verify the conversion
    const convertedUser = await queryAsync(`
      SELECT u.*, 
             b.businessId, b.businessName, b.isVerified,
             p.name as planName, p.max_deals_per_month
      FROM users u
      LEFT JOIN businesses b ON u.id = b.userId  
      LEFT JOIN plans p ON u.membershipType = p.key AND p.type = 'merchant'
      WHERE u.id = ?
    `, [userToConvert.id]);

    console.log('\n✅ 3. Conversion completed! New merchant details:');
    console.table(convertedUser);

    console.log('\n🎉 SUCCESS: User has been converted to merchant');
    console.log('💡 The user can now access merchant endpoints like:');
    console.log('   - /merchant/redemption-requests');
    console.log('   - /merchant/notifications');
    console.log('   - /merchant/profile');
    
    console.log('\n⚠️ NOTE: The user may need to log out and log back in for the session to update');

  } catch (error) {
    console.error('❌ Error converting user:', error.message);
  } finally {
    connection.end();
  }
}

convertUserToMerchant();
