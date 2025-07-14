const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/indians-in-ghana';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@indiansinghana.org' });
    if (existingAdmin) {
      console.log('❌ Admin user already exists with email: admin@indiansinghana.org');
      console.log('Email:', existingAdmin.email);
      console.log('User Type:', existingAdmin.userType);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('adminPassword123', 10);

    // Create admin user
    const adminUser = new User({
      fullName: 'Admin User',
      email: 'admin@indiansinghana.org',
      password: hashedPassword,
      userType: 'admin',
      phone: '+233-123-456-789',
      address: {
        street: 'Admin Street',
        city: 'Accra',
        region: 'Greater Accra',
        country: 'Ghana'
      },
      membershipType: 'admin',
      membershipNumber: 'ADM-001',
      status: 'approved',
      joinDate: new Date(),
      adminRole: 'superAdmin',
      permissions: [
        'user-management',
        'business-management',
        'deal-management',
        'role-management',
        'admin-settings'
      ]
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@indiansinghana.org');
    console.log('Password: adminPassword123');
    console.log('User Type: admin');
    console.log('Admin Role: superAdmin');

    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
