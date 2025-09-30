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

const markPendingEmailsAsFailed = async () => {
  try {
    console.log('🔄 Marking pending emails as failed due to SMTP issues...');
    console.log('=======================================================');
    
    // Get count of pending emails first
    const pendingCount = await queryAsync(`
      SELECT COUNT(*) as count 
      FROM email_notifications 
      WHERE status = 'pending'
    `);
    
    console.log(`📧 Found ${pendingCount[0].count} pending emails to mark as failed`);
    
    if (pendingCount[0].count === 0) {
      console.log('✅ No pending emails to process');
      return;
    }
    
    // Update all pending emails to failed status
    const updateResult = await queryAsync(`
      UPDATE email_notifications 
      SET 
        status = 'failed',
        error = 'SMTP Authentication Failed - Invalid credentials',
        failed_at = NOW(),
        updated_at = NOW()
      WHERE status = 'pending'
    `);
    
    console.log(`✅ Successfully marked ${updateResult.affectedRows} emails as failed`);
    
    // Verify the update
    const newPendingCount = await queryAsync(`
      SELECT COUNT(*) as count 
      FROM email_notifications 
      WHERE status = 'pending'
    `);
    
    console.log(`📋 Remaining pending emails: ${newPendingCount[0].count}`);
    
    // Show failed count
    const failedCount = await queryAsync(`
      SELECT COUNT(*) as count 
      FROM email_notifications 
      WHERE status = 'failed'
    `);
    
    console.log(`❌ Total failed emails: ${failedCount[0].count}`);
    
    console.log('\n📝 Summary:');
    console.log('===========');
    console.log('✅ All pending emails have been marked as failed');
    console.log('🔧 Fix the SMTP credentials in .env file to resolve email sending');
    console.log('🔄 Once SMTP is fixed, new emails will be sent successfully');
    
  } catch (error) {
    console.error('❌ Error marking pending emails as failed:', error);
  } finally {
    process.exit(0);
  }
};

markPendingEmailsAsFailed();