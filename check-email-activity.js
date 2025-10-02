const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Check recent email activity and logs
async function checkEmailLogs() {
  try {
    console.log('📋 Checking Recent Email Activity');
    console.log('=================================');
    
    const db = require('./backend/db');
    const { promisify } = require('util');
    const queryAsync = promisify(db.query).bind(db);
    
    // Check recent email notifications
    console.log('\n📧 Recent Email Notifications (Last 24 hours):');
    const recentEmails = await queryAsync(`
      SELECT id, recipient, type, subject, status, created_at, error
      FROM email_notifications 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`Found ${recentEmails.length} recent emails:`);
    recentEmails.forEach(email => {
      console.log(`- ${email.created_at}: ${email.type} to ${email.recipient} - ${email.status}${email.error ? ' (Error: ' + email.error + ')' : ''}`);
    });
    
    // Check failed emails
    console.log('\n❌ Failed Emails (Last 24 hours):');
    const failedEmails = await queryAsync(`
      SELECT id, recipient, type, subject, error, created_at
      FROM email_notifications 
      WHERE status = 'failed' 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log(`Found ${failedEmails.length} failed emails:`);
    failedEmails.forEach(email => {
      console.log(`- ${email.created_at}: ${email.type} to ${email.recipient}`);
      console.log(`  Error: ${email.error}`);
    });
    
    // Check email queue
    console.log('\n⏳ Email Queue Status:');
    const queueStatus = await queryAsync(`
      SELECT status, COUNT(*) as count
      FROM email_queue 
      GROUP BY status
    `);
    
    queueStatus.forEach(item => {
      console.log(`- ${item.status}: ${item.count} emails`);
    });
    
    // Check recent user registrations and their email notifications
    console.log('\n👤 Recent User Registrations (Last 24 hours):');
    const recentUsers = await queryAsync(`
      SELECT u.id, u.fullName, u.email, u.createdAt, u.userType,
             COUNT(en.id) as emailCount
      FROM users u
      LEFT JOIN email_notifications en ON en.recipient = u.email AND en.created_at >= u.createdAt
      WHERE u.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY u.id
      ORDER BY u.createdAt DESC
      LIMIT 5
    `);
    
    console.log(`Found ${recentUsers.length} recent registrations:`);
    recentUsers.forEach(user => {
      console.log(`- ${user.createdAt}: ${user.fullName} (${user.email}) - ${user.userType} - ${user.emailCount} emails sent`);
    });
    
    // Check recent deal activities
    console.log('\n🏷️ Recent Deal Activities (Last 24 hours):');
    const recentDeals = await queryAsync(`
      SELECT d.id, d.title, d.status, d.createdAt, d.updatedAt,
             u.email as merchantEmail,
             COUNT(en.id) as emailCount
      FROM deals d
      LEFT JOIN users u ON d.merchantId = u.id
      LEFT JOIN email_notifications en ON en.recipient = u.email 
        AND en.type LIKE '%deal%' 
        AND en.created_at >= GREATEST(d.createdAt, d.updatedAt)
      WHERE d.updatedAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY d.id
      ORDER BY d.updatedAt DESC
      LIMIT 5
    `);
    
    console.log(`Found ${recentDeals.length} recent deal activities:`);
    recentDeals.forEach(deal => {
      console.log(`- ${deal.updatedAt}: "${deal.title}" - ${deal.status} - ${deal.emailCount} emails sent`);
    });
    
    console.log('\n✅ Email log analysis completed!');
    
  } catch (error) {
    console.error('❌ Error checking email logs:', error);
  } finally {
    process.exit(0);
  }
}

checkEmailLogs();