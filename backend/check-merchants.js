const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkMerchants() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/indians-in-ghana';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const merchants = await User.find({ userType: 'merchant' })
      .select('fullName email userType businessInfo.businessName status');
    
    console.log('📊 Merchants found:', merchants.length);
    merchants.forEach(merchant => {
      console.log(`- ${merchant.fullName} (${merchant.email}) - ${merchant.businessInfo?.businessName || 'No business name'} - Status: ${merchant.status}`);
    });

    if (merchants.length === 0) {
      console.log('📝 Creating a test merchant user...');
      const testMerchant = new User({
        fullName: 'Test Merchant',
        email: 'testmerchant@example.com',
        password: 'password123',
        userType: 'merchant',
        phone: '+233-555-0123',
        address: {
          street: '123 Test St',
          city: 'Accra',
          region: 'Greater Accra',
          country: 'Ghana'
        },
        membershipType: 'silver',
        status: 'pending',
        businessInfo: {
          businessName: 'Test Business Ltd',
          businessDescription: 'A test business for demonstration',
          businessCategory: 'retail',
          businessAddress: {
            street: '123 Test St',
            city: 'Accra',
            region: 'Greater Accra',
            country: 'Ghana'
          },
          businessPhone: '+233-555-0123',
          businessEmail: 'info@testbusiness.com'
        }
      });

      await testMerchant.save();
      console.log('✅ Created test merchant user');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkMerchants();
