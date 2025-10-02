const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// SendGrid Setup and Test Script
async function setupSendGrid() {
  try {
    console.log('🚀 SendGrid Setup for Indians in Ghana Membership');
    console.log('================================================');
    
    // Check if SendGrid is configured
    if (process.env.SENDGRID_API_KEY) {
      console.log('✅ SendGrid API key found!');
      console.log(`   API Key: ${process.env.SENDGRID_API_KEY.substring(0, 8)}...`);
      
      // Test SendGrid
      console.log('\n📧 Testing SendGrid email delivery...');
      
      const emailService = require('./backend/services/emailService-integrated');
      
      const testResult = await emailService.sendEmail({
        to: 'tvidushi1234@gmail.com', // Replace with your email for testing
        templateType: 'user_welcome',
        data: {
          fullName: 'SendGrid Test User',
          firstName: 'Test',
          email: 'tvidushi1234@gmail.com',
          membershipNumber: 'SG_TEST_001',
          validationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()
        }
      });
      
      console.log('\n📊 SendGrid Test Results:');
      console.log(`✅ Success: ${testResult.sent}`);
      console.log(`📧 Message ID: ${testResult.messageId}`);
      console.log(`🔧 Method: ${testResult.method}`);
      
      if (testResult.sent) {
        console.log('\n🎉 SUCCESS! SendGrid is working perfectly!');
        console.log('✅ Your emails will now be delivered via SendGrid API');
        console.log('✅ No more SMTP blocking issues');
        console.log('✅ Professional email delivery');
      } else {
        console.log('\n❌ SendGrid test failed');
        console.log(`Error: ${testResult.error}`);
      }
      
    } else {
      console.log('⚠️ SendGrid API key not configured');
      console.log('\n📋 Setup Instructions:');
      console.log('1. Go to https://sendgrid.com and create a free account');
      console.log('2. Navigate to Settings > API Keys');
      console.log('3. Create a new API key with "Mail Send" permissions');
      console.log('4. Copy the API key');
      console.log('5. Add to your .env file:');
      console.log('   SENDGRID_API_KEY=your_api_key_here');
      console.log('6. For production, add to Render.com environment variables');
      console.log('7. Restart your application');
      console.log('\n💡 Benefits:');
      console.log('   ✅ 100 emails/day free forever');
      console.log('   ✅ Professional email delivery');
      console.log('   ✅ Works with all hosting providers');
      console.log('   ✅ Better deliverability than Gmail SMTP');
    }
    
    // Show current email status
    console.log('\n📊 Current Email System Status:');
    const emailService = require('./backend/services/emailService-integrated');
    const status = emailService.getServiceStatus();
    
    console.log(`   SMTP Available: ${status.hasCredentials ? '✅' : '❌'}`);
    console.log(`   SMTP Blocked: ${status.smtpBlocked ? '❌' : '✅'}`);
    console.log(`   SendGrid Available: ${!!process.env.SENDGRID_API_KEY ? '✅' : '❌'}`);
    console.log(`   Templates Loaded: ${status.templatesLoaded}`);
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  } finally {
    process.exit(0);
  }
}

setupSendGrid();