const bcrypt = require('bcryptjs');
const db = require('./db');
const { generateMembershipNumber } = require('./utils/membershipGenerator');

// Admin account details
const adminEmail = 'vidu110322@gmail.com';
const adminPassword = 'AdminPass123!'; // Strong password
const adminFullName = 'Admin User';

async function createAdminAccount() {
  try {
    console.log('🚀 Creating admin account...');
    
    // Check if user already exists
    const checkUserQuery = 'SELECT id FROM users WHERE email = ?';
    const existingUser = await new Promise((resolve, reject) => {
      db.query(checkUserQuery, [adminEmail], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    if (existingUser.length > 0) {
      console.log('❌ User with this email already exists!');
      process.exit(1);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Generate membership number
    const membershipNumber = generateMembershipNumber();
    
    // Calculate validation date (1 year from now)
    const validationDate = new Date();
    validationDate.setFullYear(validationDate.getFullYear() + 1);
    
    // Insert admin user
    const insertQuery = `
      INSERT INTO users (
        fullName, email, password, phone, userType, status, adminRole, 
        membershipType, membershipNumber, validationDate, planAssignedAt,
        termsAccepted, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())
    `;
    
    const insertValues = [
      adminFullName,
      adminEmail,
      hashedPassword,
      '+233123456789', // Default phone
      'admin',
      'approved',
      'superAdmin',
      'admin',
      membershipNumber,
      validationDate.toISOString().slice(0, 19).replace('T', ' '),
      1 // termsAccepted
    ];
    
    const result = await new Promise((resolve, reject) => {
      db.query(insertQuery, insertValues, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    console.log('✅ Admin account created successfully!');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👤 Full Name: ${adminFullName}`);
    console.log(`🎫 Membership Number: ${membershipNumber}`);
    console.log(`🆔 User ID: ${result.insertId}`);
    console.log(`👑 Role: superAdmin`);
    console.log('');
    console.log('⚠️  IMPORTANT: Please save these credentials securely and change the password after first login!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    process.exit(1);
  }
}

// Run the script
createAdminAccount();
