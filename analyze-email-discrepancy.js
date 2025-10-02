const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Check if website emails are being attempted vs test emails
async function analyzeEmailDiscrepancy() {
  try {
    console.log('🔍 Analyzing Email Flow Discrepancy');
    console.log('===================================');
    
    const db = require('./backend/db');
    const { promisify } = require('util');
    const queryAsync = promisify(db.query).bind(db);
    
    // Check emails by type to see patterns
    console.log('\n📊 Email Types Distribution (Last 7 days):');
    const emailTypes = await queryAsync(`
      SELECT type, status, COUNT(*) as count
      FROM email_notifications 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY type, status
      ORDER BY type, status
    `);
    
    const typeGroups = {};
    emailTypes.forEach(row => {
      if (!typeGroups[row.type]) typeGroups[row.type] = {};
      typeGroups[row.type][row.status] = row.count;
    });
    
    Object.keys(typeGroups).forEach(type => {
      console.log(`\n${type}:`);
      Object.keys(typeGroups[type]).forEach(status => {
        console.log(`  - ${status}: ${typeGroups[type][status]}`);
      });
    });
    
    // Check recent user registrations and if they triggered emails
    console.log('\n\n👤 Recent User Registrations vs Email Notifications:');
    const userRegistrations = await queryAsync(`
      SELECT u.id, u.fullName, u.email, u.createdAt, u.userType,
             (SELECT COUNT(*) FROM email_notifications en 
              WHERE en.recipient = u.email 
              AND en.type IN ('user_welcome', 'merchant_welcome')
              AND en.created_at >= u.createdAt) as welcomeEmails,
             (SELECT COUNT(*) FROM email_notifications en 
              WHERE en.recipient LIKE '%admin%' OR en.recipient = 'vidu110322@gmail.com'
              AND en.type IN ('admin_new_registration', 'admin_new_merchant')
              AND en.created_at >= u.createdAt) as adminEmails
      FROM users u
      WHERE u.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY u.createdAt DESC
      LIMIT 10
    `);
    
    console.log(`Found ${userRegistrations.length} recent registrations:`);
    userRegistrations.forEach(user => {
      const emailStatus = user.welcomeEmails > 0 ? '✅' : '❌';
      const adminStatus = user.adminEmails > 0 ? '✅' : '❌';
      console.log(`${emailStatus} ${user.createdAt.toISOString()}: ${user.fullName} (${user.userType})`);
      console.log(`   Welcome: ${user.welcomeEmails}, Admin: ${user.adminEmails}`);
    });
    
    // Check for failed email patterns
    console.log('\n\n❌ Failed Email Analysis (Last 24 hours):');
    const failedEmails = await queryAsync(`
      SELECT recipient, type, error, created_at, subject
      FROM email_notifications 
      WHERE status IN ('failed', '') 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${failedEmails.length} failed/empty status emails:`);
    failedEmails.forEach(email => {
      console.log(`- ${email.created_at}: ${email.type} to ${email.recipient}`);
      console.log(`  Error: ${email.error || 'No error recorded'}`);
      console.log(`  Subject: ${email.subject || 'No subject'}`);
    });
    
    // Check if notification service is being called
    console.log('\n\n🔍 Checking for notification service call patterns...');
    
    // Look for any emails that show the console.log patterns we saw in the service
    const notificationLogs = await queryAsync(`
      SELECT type, recipient, status, created_at, error, subject
      FROM email_notifications 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      AND (error LIKE '%Processing%' OR subject LIKE '%Processing%' OR type LIKE '%notification%')
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${notificationLogs.length} notification-related logs`);
    notificationLogs.forEach(log => {
      console.log(`- ${log.created_at}: ${log.type} - ${log.status}`);
    });
    
    console.log('\n✅ Email discrepancy analysis completed!');
    
  } catch (error) {
    console.error('❌ Error analyzing email discrepancy:', error);
  } finally {
    process.exit(0);
  }
}

analyzeEmailDiscrepancy();