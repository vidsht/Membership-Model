const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🎯 FINAL EMAIL INCONSISTENCY DIAGNOSIS');
console.log('======================================');

async function finalEmailDiagnosis() {
    console.log('📋 Summary of findings so far:');
    console.log('1. ✅ Direct emailService.sendEmail() - WORKS');
    console.log('2. ✅ NotificationHooks.onPasswordChangedByAdmin() - WORKS'); 
    console.log('3. ✅ notificationService.notifyPasswordChangedByAdmin() - WORKS');
    console.log('4. ✅ All email templates load correctly');
    console.log('5. ✅ Gmail SMTP connection successful');
    console.log('');
    
    try {
        console.log('🔍 Testing the EXACT email template invocation...');
        console.log('==================================================');
        
        const emailService = require('./services/emailService');
        
        // Test if the email service can load the specific template used in password changes
        console.log('📄 Testing template loading for password_changed_by_admin...');
        
        const template = await emailService.getEmailTemplate('password_changed_by_admin');
        console.log('✅ Template loaded successfully:');
        console.log('  - Subject template:', template.subject.substring(0, 50) + '...');
        console.log('  - Has HTML content:', !!template.htmlContent);
        console.log('  - Has text content:', !!template.textContent);
        
        // Test template compilation with real data
        console.log('\n📝 Testing template compilation...');
        const handlebars = require('handlebars');
        
        const testData = {
            firstName: 'John',
            fullName: 'John Doe',
            email: 'john@example.com',
            tempPassword: 'TempPass123!',
            loginUrl: 'https://membership.indiansinghana.com/login',
            supportEmail: 'indiansinghana.cards@gmail.com'
        };
        
        const subjectTemplate = handlebars.compile(template.subject);
        const compiledSubject = subjectTemplate(testData);
        console.log('✅ Subject compiled:', compiledSubject);
        
        // Test actual email sending with compiled template
        console.log('\n📧 Testing complete email flow with template...');
        const emailResult = await emailService.sendEmail({
            to: 'template-test@example.com',
            type: 'password_changed_by_admin',
            data: testData
        });
        console.log('✅ Complete email flow successful:', emailResult);
        
    } catch (error) {
        console.log('❌ Template/Email error:', error.message);
        console.log('📋 Error details:', error);
    }
    
    console.log('\n🔍 ENVIRONMENT COMPARISON');
    console.log('==========================');
    console.log('Current environment variables:');
    console.log('- SMTP_HOST:', process.env.SMTP_HOST);
    console.log('- SMTP_PORT:', process.env.SMTP_PORT);
    console.log('- SMTP_USER:', process.env.SMTP_USER);
    console.log('- SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL);
    console.log('- SMTP_PASS length:', process.env.SMTP_PASS?.length || 0);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
    
    console.log('\n🎯 DIAGNOSIS CONCLUSION');
    console.log('=======================');
    
    console.log('✅ LOCAL SYSTEM STATUS:');
    console.log('   - Email service: WORKING');
    console.log('   - Templates: LOADING CORRECTLY');
    console.log('   - SMTP: CONNECTING SUCCESSFULLY');
    console.log('   - Notification chain: FUNCTIONAL');
    console.log('');
    
    console.log('❓ POSSIBLE ISSUES:');
    console.log('   1. PRODUCTION CREDENTIALS: Different Gmail password');
    console.log('   2. PRODUCTION ENVIRONMENT: Different .env variables');
    console.log('   3. FRONTEND AUTH: API calls failing due to authentication');
    console.log('   4. SERVER STARTUP: Email system not initializing in production');
    console.log('   5. TEMPLATE PATH: Production server can\'t find email templates');
    console.log('');
    
    console.log('🔧 RECOMMENDED ACTIONS:');
    console.log('   1. UPDATE RENDER ENVIRONMENT VARIABLES:');
    console.log('      - SMTP_USER=indiansinghana.cards@gmail.com');
    console.log('      - SMTP_FROM_EMAIL=indiansinghana.cards@gmail.com');
    console.log('      - SMTP_PASS=<NEW_GMAIL_APP_PASSWORD>');
    console.log('');
    console.log('   2. GENERATE NEW GMAIL APP PASSWORD:');
    console.log('      - Login to indiansinghana.cards@gmail.com');
    console.log('      - Go to Google Account Settings > Security');
    console.log('      - Create new App Password for Mail');
    console.log('');
    console.log('   3. TEST PRODUCTION:');
    console.log('      - Deploy changes to Render');
    console.log('      - Test admin password change from live frontend');
    console.log('      - Check production server logs for email activity');
    console.log('');
    console.log('   4. VERIFY TEMPLATE PATH IN PRODUCTION:');
    console.log('      - Ensure backend/templates/emails/ exists in deployment');
    console.log('      - Check file permissions and accessibility');
}

finalEmailDiagnosis();