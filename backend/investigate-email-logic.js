const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 DEEP EMAIL SERVICE INVESTIGATION');
console.log('===================================');

async function investigateEmailServiceLogic() {
    console.log('📋 Step 1: Check environment variable loading\n');
    
    console.log('Current environment variables:');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '****' + process.env.SMTP_PASS.slice(-4) : 'undefined');
    console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '****' + process.env.EMAIL_PASSWORD.slice(-4) : 'undefined');
    
    console.log('\n📧 Step 2: Check EmailService transporter configuration\n');
    
    // Import and check the email service
    const emailService = require('./services/emailService');
    
    // Check the transporter configuration
    const transporterOptions = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER || 'cards@indiansinghana.com',
            pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD
        }
    };
    
    console.log('Transporter configuration:');
    console.log('Host:', transporterOptions.host);
    console.log('Port:', transporterOptions.port);
    console.log('Auth user:', transporterOptions.auth.user);
    console.log('Auth pass:', transporterOptions.auth.pass ? '****' + transporterOptions.auth.pass.slice(-4) : 'undefined');
    
    console.log('\n🚨 POTENTIAL ISSUES IDENTIFIED:');
    
    if (transporterOptions.auth.user !== process.env.SMTP_USER) {
        console.log('❌ CRITICAL: Auth user is falling back to old email!');
        console.log('   Expected:', process.env.SMTP_USER);
        console.log('   Actual:', transporterOptions.auth.user);
    } else {
        console.log('✅ Auth user matches environment variable');
    }
    
    if (!transporterOptions.auth.pass) {
        console.log('❌ CRITICAL: No password found!');
    } else if (transporterOptions.auth.pass !== process.env.SMTP_PASS) {
        console.log('❌ CRITICAL: Auth password is not using SMTP_PASS!');
        console.log('   Using EMAIL_PASSWORD instead of SMTP_PASS');
    } else {
        console.log('✅ Auth password matches SMTP_PASS');
    }
}

async function testDifferentEmailFlows() {
    console.log('\n🧪 Step 3: Test different email sending flows\n');
    
    try {
        // Test 1: Direct email service call
        console.log('📞 Test 1: Direct emailService.sendEmail()...');
        const emailService = require('./services/emailService');
        
        const directResult = await emailService.sendEmail({
            to: 'directtest@example.com',
            type: 'password_changed_by_admin',
            data: {
                firstName: 'Direct',
                fullName: 'Direct Test',
                email: 'directtest@example.com',
                tempPassword: 'DirectTest123!',
                loginUrl: process.env.FRONTEND_URL
            }
        });
        
        console.log('✅ Direct email test result:', directResult);
        
    } catch (error) {
        console.log('❌ Direct email test failed:', error.message);
        
        if (error.message.includes('Username and Password not accepted')) {
            console.log('🔍 This is the authentication error you mentioned!');
            console.log('🔧 The issue is in the EmailService transporter configuration');
        }
    }
    
    try {
        // Test 2: Notification service call  
        console.log('\n📞 Test 2: NotificationService.notifyPasswordChangedByAdmin()...');
        const notificationService = require('./services/notificationService');
        
        const notificationResult = await notificationService.notifyPasswordChangedByAdmin(1, {
            fullName: 'Notification Test',
            email: 'notificationtest@example.com',
            tempPassword: 'NotificationTest123!'
        });
        
        console.log('✅ Notification test result:', notificationResult);
        
    } catch (error) {
        console.log('❌ Notification test failed:', error.message);
        
        if (error.message.includes('Username and Password not accepted')) {
            console.log('🔍 Same authentication error in notification flow!');
        }
    }
}

async function debugEmailServiceInitialization() {
    console.log('\n🔍 Step 4: Debug EmailService initialization\n');
    
    // Check when and how the email service initializes
    console.log('📋 Checking email service initialization timing...');
    
    // Check if environment variables are available during initialization
    console.log('Environment available during require():');
    console.log('SMTP_USER available:', !!process.env.SMTP_USER);
    console.log('SMTP_PASS available:', !!process.env.SMTP_PASS);
    
    if (!process.env.SMTP_USER) {
        console.log('❌ CRITICAL ISSUE: SMTP_USER not available during initialization!');
        console.log('This would cause fallback to old email address');
    }
    
    if (!process.env.SMTP_PASS) {
        console.log('❌ CRITICAL ISSUE: SMTP_PASS not available during initialization!');
        console.log('This would cause authentication to fail');
    }
}

async function runInvestigation() {
    await investigateEmailServiceLogic();
    await testDifferentEmailFlows();
    await debugEmailServiceInitialization();
    
    console.log('\n🎯 INVESTIGATION SUMMARY:');
    console.log('========================');
    console.log('If authentication errors occur in automatic emails but not manual tests:');
    console.log('');
    console.log('LIKELY CAUSES:');
    console.log('1. EmailService fallback to old email address (cards@indiansinghana.com)');
    console.log('2. Environment variables not loaded when EmailService initializes');
    console.log('3. Multiple email service instances with different configurations');
    console.log('4. Transporter cached with old credentials');
    console.log('');
    console.log('SOLUTION:');
    console.log('1. Remove fallback email addresses from EmailService constructor');
    console.log('2. Ensure .env is loaded before EmailService initialization');
    console.log('3. Add validation to ensure correct credentials are used');
}

runInvestigation();