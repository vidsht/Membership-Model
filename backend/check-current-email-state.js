const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 INVESTIGATING CURRENT EMAIL SYSTEM STATE');
console.log('==========================================');

async function checkCurrentEmailSystem() {
    try {
        console.log('📋 Step 1: Environment Variables Check\n');
        console.log('SMTP_HOST:', process.env.SMTP_HOST);
        console.log('SMTP_PORT:', process.env.SMTP_PORT);
        console.log('SMTP_USER:', process.env.SMTP_USER);
        console.log('SMTP_PASS:', process.env.SMTP_PASS ? '****' + process.env.SMTP_PASS.slice(-4) : 'undefined');
        console.log('SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL);
        
        console.log('\n📧 Step 2: Testing EmailService Initialization\n');
        
        // Clear module cache to ensure fresh initialization
        Object.keys(require.cache).forEach(key => {
            if (key.includes('emailService')) {
                delete require.cache[key];
            }
        });
        
        const emailService = require('./services/emailService');
        console.log('✅ EmailService loaded successfully');
        
        console.log('\n🧪 Step 3: Testing Direct Email Send\n');
        
        const testEmailData = {
            to: 'current-test@example.com',
            type: 'password_changed_by_admin',
            data: {
                firstName: 'Current Test',
                fullName: 'Current Test User',
                email: 'current-test@example.com',
                tempPassword: 'CurrentTest123!',
                loginUrl: process.env.FRONTEND_URL || 'https://membership.indiansinghana.com',
                supportEmail: 'indiansinghana.cards@gmail.com'
            }
        };
        
        console.log('📞 Calling emailService.sendEmail()...');
        console.log('Data:', JSON.stringify(testEmailData, null, 2));
        
        const result = await emailService.sendEmail(testEmailData);
        console.log('✅ Email send result:', result);
        
        return result;
        
    } catch (error) {
        console.log('❌ Email system test failed:', error.message);
        console.log('📋 Full error:', error);
        
        if (error.message.includes('Username and Password not accepted')) {
            console.log('\n🔍 AUTHENTICATION ERROR - Gmail is rejecting credentials');
        } else if (error.message.includes('Missing SMTP credentials')) {
            console.log('\n🔍 ENVIRONMENT VARIABLE ERROR - Credentials not loaded');
        } else {
            console.log('\n🔍 OTHER ERROR - Check details above');
        }
        
        return null;
    }
}

async function checkNotificationFlow() {
    console.log('\n🔗 Step 4: Testing Notification Flow\n');
    
    try {
        console.log('📞 Testing NotificationHooks.onPasswordChangedByAdmin()...');
        
        const NotificationHooks = require('./services/notificationHooks');
        
        const notificationResult = await NotificationHooks.onPasswordChangedByAdmin(1, {
            fullName: 'Notification Flow Test',
            email: 'notification-flow-test@example.com',
            tempPassword: 'NotificationTest123!'
        });
        
        console.log('✅ Notification flow result:', notificationResult);
        
        return notificationResult;
        
    } catch (error) {
        console.log('❌ Notification flow failed:', error.message);
        console.log('📋 Full error:', error);
        
        return null;
    }
}

async function checkEmailQueue() {
    console.log('\n📊 Step 5: Checking Email Queue/Database\n');
    
    try {
        const db = require('./db');
        
        const queryAsync = (sql, params = []) => {
            return new Promise((resolve, reject) => {
                db.query(sql, params, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });
        };
        
        // Check if email_notifications table exists
        console.log('📋 Checking email_notifications table...');
        
        try {
            const tableStructure = await queryAsync('DESCRIBE email_notifications');
            console.log('✅ email_notifications table exists');
            console.log('Columns:', tableStructure.map(col => col.Field).join(', '));
            
            // Check recent email logs
            const recentEmails = await queryAsync(
                'SELECT * FROM email_notifications ORDER BY created_at DESC LIMIT 5'
            );
            
            console.log(`📧 Recent emails in database: ${recentEmails.length}`);
            recentEmails.forEach((email, index) => {
                console.log(`${index + 1}. ${email.type} to ${email.recipient} - Status: ${email.status}`);
            });
            
        } catch (tableError) {
            console.log('ℹ️ email_notifications table does not exist or is not accessible');
            console.log('This means the simple email service is being used (no database logging)');
        }
        
    } catch (error) {
        console.log('❌ Database check failed:', error.message);
    }
}

async function runCurrentSystemCheck() {
    const emailResult = await checkCurrentEmailSystem();
    const notificationResult = await checkNotificationFlow();
    await checkEmailQueue();
    
    console.log('\n🎯 CURRENT SYSTEM DIAGNOSIS:');
    console.log('============================');
    console.log('Direct email service:', emailResult ? '✅ WORKING' : '❌ FAILED');
    console.log('Notification flow:', notificationResult ? '✅ WORKING' : '❌ FAILED');
    
    if (!emailResult && !notificationResult) {
        console.log('\n❌ CRITICAL: Both email service and notification flow are failing');
        console.log('This explains why no emails are being sent');
    } else if (emailResult && !notificationResult) {
        console.log('\n⚠️ Email service works but notification flow fails');
        console.log('The admin password change might not be triggering notifications');
    } else if (!emailResult && notificationResult) {
        console.log('\n⚠️ Notification flow works but email service fails');
        console.log('Emails are being processed but not sent');
    } else {
        console.log('\n✅ Both systems working - issue might be elsewhere');
        console.log('Check admin route integration or frontend calls');
    }
}

runCurrentSystemCheck();