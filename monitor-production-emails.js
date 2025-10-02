const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Monitor email queue processing for production
async function monitorEmailQueue() {
  try {
    console.log('📋 Monitoring Email Queue for Production Issues');
    console.log('================================================');
    
    const db = require('./backend/db');
    const { promisify } = require('util');
    const queryAsync = promisify(db.query).bind(db);
    
    // Check email queue status
    console.log('\n📤 Email Queue Status:');
    const queueStats = await queryAsync(`
      SELECT status, priority, COUNT(*) as count,
             MIN(created_at) as oldest,
             MAX(created_at) as newest
      FROM email_queue 
      GROUP BY status, priority
      ORDER BY status, priority
    `);
    
    if (queueStats.length === 0) {
      console.log('✅ Email queue is empty');
    } else {
      queueStats.forEach(stat => {
        console.log(`${stat.status} (${stat.priority}): ${stat.count} emails`);
        console.log(`  Oldest: ${stat.oldest}`);
        console.log(`  Newest: ${stat.newest}`);
      });
    }
    
    // Check recent email failures with timeout errors
    console.log('\n❌ Recent Timeout Failures (Last 2 hours):');
    const timeoutFailures = await queryAsync(`
      SELECT recipient, type, error, created_at, status
      FROM email_notifications 
      WHERE (error LIKE '%timeout%' OR error LIKE '%Connection timeout%')
      AND created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${timeoutFailures.length} timeout failures:`);
    timeoutFailures.forEach(failure => {
      console.log(`- ${failure.created_at}: ${failure.type} to ${failure.recipient}`);
      console.log(`  Status: ${failure.status || 'no status'}`);
      console.log(`  Error: ${failure.error}`);
    });
    
    // Check success rate in last hour
    console.log('\n📊 Email Success Rate (Last Hour):');
    const hourlyStats = await queryAsync(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' OR error IS NOT NULL THEN 1 ELSE 0 END) as failed
      FROM email_notifications 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `);
    
    if (hourlyStats[0].total > 0) {
      const rate = ((hourlyStats[0].sent / hourlyStats[0].total) * 100).toFixed(2);
      console.log(`Total: ${hourlyStats[0].total}, Sent: ${hourlyStats[0].sent}, Failed: ${hourlyStats[0].failed}`);
      console.log(`Success Rate: ${rate}%`);
    } else {
      console.log('No emails in the last hour');
    }
    
    // Check if email service is configured for production
    console.log('\n⚙️ Production Email Configuration:');
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
    console.log(`SMTP_USER: ${process.env.SMTP_USER ? '✅ Set' : '❌ Not set'}`);
    console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? '✅ Set' : '❌ Not set'}`);
    console.log(`DISABLE_SMTP_VERIFY: ${process.env.DISABLE_SMTP_VERIFY}`);
    
    console.log('\n✅ Email queue monitoring completed!');
    console.log('\n💡 After deployment, the new retry mechanism should:');
    console.log('   - Use 45-second timeout instead of 30 seconds');
    console.log('   - Retry timeout errors up to 3 times');
    console.log('   - Queue persistent failures for later processing');
    console.log('   - Show attempt count in logs');
    
  } catch (error) {
    console.error('❌ Error monitoring email queue:', error);
  } finally {
    process.exit(0);
  }
}

monitorEmailQueue();