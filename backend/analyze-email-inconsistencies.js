require('dotenv').config();
const mysql = require('mysql2');
const db = require('./db');

const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

const analyzeEmailInconsistencies = async () => {
  try {
    console.log('🔍 Analyzing Email Data Inconsistencies...');
    console.log('================================================');
    
    // Check emails marked as "sent" but missing sent_at timestamp
    console.log('📧 Checking "sent" emails with missing sent_at timestamps:');
    const sentWithoutTimestamp = await queryAsync(`
      SELECT id, recipient, subject, status, message_id, sent_at, created_at
      FROM email_notifications 
      WHERE status = 'sent' AND sent_at IS NULL
      ORDER BY id DESC
      LIMIT 10
    `);
    
    console.log(`Found ${sentWithoutTimestamp.length} "sent" emails without sent_at timestamp:`);
    sentWithoutTimestamp.forEach(email => {
      console.log(`  ID ${email.id}: ${email.status} | MessageID: ${email.message_id ? 'Present' : 'Missing'} | sent_at: ${email.sent_at || 'NULL'}`);
    });
    
    // Check emails marked as "sent" WITH sent_at timestamp
    console.log('\n📧 Checking "sent" emails WITH sent_at timestamps:');
    const sentWithTimestamp = await queryAsync(`
      SELECT id, recipient, subject, status, message_id, sent_at, created_at
      FROM email_notifications 
      WHERE status = 'sent' AND sent_at IS NOT NULL
      ORDER BY id DESC
      LIMIT 5
    `);
    
    console.log(`Found ${sentWithTimestamp.length} "sent" emails WITH sent_at timestamp:`);
    sentWithTimestamp.forEach(email => {
      console.log(`  ID ${email.id}: ${email.status} | MessageID: ${email.message_id ? 'Present' : 'Missing'} | sent_at: ${email.sent_at}`);
    });
    
    // Check pending emails in detail
    console.log('\n📧 Checking pending emails in detail:');
    const pendingEmails = await queryAsync(`
      SELECT id, recipient, subject, status, message_id, sent_at, failed_at, error, created_at, updated_at
      FROM email_notifications 
      WHERE status = 'pending'
      ORDER BY id DESC
      LIMIT 10
    `);
    
    console.log(`Found ${pendingEmails.length} pending emails:`);
    pendingEmails.forEach(email => {
      console.log(`  ID ${email.id}: To ${email.recipient}`);
      console.log(`    Created: ${email.created_at}`);
      console.log(`    Updated: ${email.updated_at}`);
      console.log(`    Error: ${email.error || 'NULL'}`);
      console.log(`    MessageID: ${email.message_id || 'NULL'}`);
      console.log('    ---');
    });
    
    // Summary statistics
    console.log('\n📊 Email Status Summary:');
    const statusCounts = await queryAsync(`
      SELECT 
        status,
        COUNT(*) as total,
        COUNT(CASE WHEN message_id IS NOT NULL THEN 1 END) as with_message_id,
        COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as with_sent_at,
        COUNT(CASE WHEN failed_at IS NOT NULL THEN 1 END) as with_failed_at
      FROM email_notifications 
      GROUP BY status
      ORDER BY total DESC
    `);
    
    statusCounts.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.total} total`);
      console.log(`    - With message_id: ${stat.with_message_id}`);
      console.log(`    - With sent_at: ${stat.with_sent_at}`);
      console.log(`    - With failed_at: ${stat.with_failed_at}`);
    });
    
    // Check for recent email attempts
    console.log('\n🕐 Recent email activity (last 24 hours):');
    const recentEmails = await queryAsync(`
      SELECT id, recipient, subject, status, created_at, updated_at
      FROM email_notifications 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${recentEmails.length} emails in the last 24 hours:`);
    recentEmails.forEach(email => {
      console.log(`  ID ${email.id}: ${email.status} | Created: ${email.created_at} | Updated: ${email.updated_at}`);
    });
    
  } catch (error) {
    console.error('❌ Error analyzing email inconsistencies:', error);
  } finally {
    process.exit(0);
  }
};

analyzeEmailInconsistencies();