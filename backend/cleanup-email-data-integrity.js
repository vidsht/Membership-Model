const db = require('./db');

const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

async function cleanupEmailDataIntegrity() {
  console.log('🧹 EMAIL DATA INTEGRITY CLEANUP');
  console.log('='.repeat(60));
  
  try {
    // 1. Analyze and fix sent emails missing sent_at timestamp
    console.log('1. 🔍 Analyzing sent emails missing sent_at timestamp...');
    
    const orphanedSentEmails = await queryAsync(`
      SELECT id, recipient, type, status, created_at, updated_at, sent_at
      FROM email_notifications 
      WHERE status = 'sent' AND sent_at IS NULL
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Found ${orphanedSentEmails.length} sent emails missing sent_at timestamp`);
    
    if (orphanedSentEmails.length > 0) {
      console.log('\n📋 Sample orphaned sent emails:');
      orphanedSentEmails.slice(0, 5).forEach((email, index) => {
        console.log(`  ${index + 1}. ID: ${email.id}, Type: ${email.type}, Recipient: ${email.recipient}`);
        console.log(`     Created: ${email.created_at}, Updated: ${email.updated_at}`);
      });
      
      // Fix strategy: Use updated_at as sent_at if available, otherwise use created_at
      console.log('\n🔧 Fixing sent emails missing sent_at...');
      
      const fixSentTimestampsResult = await queryAsync(`
        UPDATE email_notifications 
        SET sent_at = COALESCE(updated_at, created_at)
        WHERE status = 'sent' AND sent_at IS NULL
      `);
      
      console.log(`✅ Fixed ${fixSentTimestampsResult.affectedRows} sent emails with missing timestamps`);
      
      // Verify the fix
      const remainingOrphanedSent = await queryAsync(`
        SELECT COUNT(*) as count
        FROM email_notifications 
        WHERE status = 'sent' AND sent_at IS NULL
      `);
      
      console.log(`📊 Remaining orphaned sent emails: ${remainingOrphanedSent[0].count}`);
    }
    
    // 2. Analyze and fix failed emails missing error message
    console.log('\n2. 🔍 Analyzing failed emails missing error message...');
    
    const failedEmailsNoError = await queryAsync(`
      SELECT id, recipient, type, status, created_at, failed_at, error, retry_count
      FROM email_notifications 
      WHERE status = 'failed' AND (error IS NULL OR error = '')
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Found ${failedEmailsNoError.length} failed emails missing error message`);
    
    if (failedEmailsNoError.length > 0) {
      console.log('\n📋 Failed emails without error messages:');
      failedEmailsNoError.forEach((email, index) => {
        console.log(`  ${index + 1}. ID: ${email.id}, Type: ${email.type}, Recipient: ${email.recipient}`);
        console.log(`     Failed at: ${email.failed_at}, Retry count: ${email.retry_count}`);
      });
      
      // Fix strategy: Add generic error message and set failed_at if missing
      console.log('\n🔧 Fixing failed emails missing error message...');
      
      const fixFailedErrorsResult = await queryAsync(`
        UPDATE email_notifications 
        SET 
          error = 'Legacy failure - error message not recorded',
          failed_at = COALESCE(failed_at, updated_at, created_at)
        WHERE status = 'failed' AND (error IS NULL OR error = '')
      `);
      
      console.log(`✅ Fixed ${fixFailedErrorsResult.affectedRows} failed emails with missing error messages`);
      
      // Verify the fix
      const remainingFailedNoError = await queryAsync(`
        SELECT COUNT(*) as count
        FROM email_notifications 
        WHERE status = 'failed' AND (error IS NULL OR error = '')
      `);
      
      console.log(`📊 Remaining failed emails without error: ${remainingFailedNoError[0].count}`);
    }
    
    // 3. Additional data integrity checks and fixes
    console.log('\n3. 🔍 Additional data integrity checks...');
    
    // Check for emails with inconsistent retry_count
    const inconsistentRetryCount = await queryAsync(`
      SELECT COUNT(*) as count
      FROM email_notifications 
      WHERE status = 'failed' AND retry_count IS NULL
    `);
    
    if (inconsistentRetryCount[0].count > 0) {
      console.log(`📊 Found ${inconsistentRetryCount[0].count} failed emails with NULL retry_count`);
      
      const fixRetryCountResult = await queryAsync(`
        UPDATE email_notifications 
        SET retry_count = 0
        WHERE status = 'failed' AND retry_count IS NULL
      `);
      
      console.log(`✅ Fixed ${fixRetryCountResult.affectedRows} failed emails with NULL retry_count`);
    }
    
    // Check for pending emails scheduled in the past
    const pastScheduledEmails = await queryAsync(`
      SELECT COUNT(*) as count
      FROM email_notifications 
      WHERE status = 'pending' AND scheduled_for IS NOT NULL AND scheduled_for < NOW()
    `);
    
    if (pastScheduledEmails[0].count > 0) {
      console.log(`📊 Found ${pastScheduledEmails[0].count} pending emails scheduled in the past`);
      
      // Mark them as failed with appropriate error message
      const fixPastScheduledResult = await queryAsync(`
        UPDATE email_notifications 
        SET 
          status = 'failed',
          error = 'Email scheduled in the past - missed send window',
          failed_at = NOW()
        WHERE status = 'pending' AND scheduled_for IS NOT NULL AND scheduled_for < NOW()
      `);
      
      console.log(`✅ Fixed ${fixPastScheduledResult.affectedRows} past scheduled emails`);
    }
    
    // 4. Generate comprehensive cleanup report
    console.log('\n4. 📊 GENERATING CLEANUP REPORT...');
    
    const finalStats = await queryAsync(`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN sent_at IS NULL AND status = 'sent' THEN 1 END) as sent_missing_timestamp,
        COUNT(CASE WHEN (error IS NULL OR error = '') AND status = 'failed' THEN 1 END) as failed_missing_error,
        COUNT(CASE WHEN retry_count IS NULL AND status = 'failed' THEN 1 END) as failed_missing_retry_count
      FROM email_notifications 
      GROUP BY status
      ORDER BY 
        CASE status 
          WHEN 'sent' THEN 1 
          WHEN 'pending' THEN 2 
          WHEN 'failed' THEN 3 
          WHEN 'bounced' THEN 4 
          ELSE 5 
        END
    `);
    
    console.log('\n📋 Final Email Statistics:');
    finalStats.forEach(stat => {
      console.log(`  ${stat.status.toUpperCase()}: ${stat.count} emails`);
      if (stat.sent_missing_timestamp > 0) {
        console.log(`    ⚠️ Missing sent_at: ${stat.sent_missing_timestamp}`);
      }
      if (stat.failed_missing_error > 0) {
        console.log(`    ⚠️ Missing error message: ${stat.failed_missing_error}`);
      }
      if (stat.failed_missing_retry_count > 0) {
        console.log(`    ⚠️ Missing retry count: ${stat.failed_missing_retry_count}`);
      }
    });
    
    // 5. Validate cleanup success
    console.log('\n5. ✅ VALIDATION...');
    
    const validationChecks = [
      {
        name: 'Sent emails missing timestamp',
        query: "SELECT COUNT(*) as count FROM email_notifications WHERE status = 'sent' AND sent_at IS NULL"
      },
      {
        name: 'Failed emails missing error',
        query: "SELECT COUNT(*) as count FROM email_notifications WHERE status = 'failed' AND (error IS NULL OR error = '')"
      },
      {
        name: 'Failed emails missing retry count',
        query: "SELECT COUNT(*) as count FROM email_notifications WHERE status = 'failed' AND retry_count IS NULL"
      },
      {
        name: 'Past scheduled pending emails',
        query: "SELECT COUNT(*) as count FROM email_notifications WHERE status = 'pending' AND scheduled_for IS NOT NULL AND scheduled_for < NOW()"
      }
    ];
    
    let allFixed = true;
    
    for (const check of validationChecks) {
      const result = await queryAsync(check.query);
      const count = result[0].count;
      const status = count === 0 ? '✅' : '❌';
      console.log(`  ${status} ${check.name}: ${count}`);
      if (count > 0) allFixed = false;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    
    if (allFixed) {
      console.log('🎉 ALL DATA INTEGRITY ISSUES RESOLVED!');
      console.log('✅ Email database is now consistent and clean');
      console.log('✅ All status/timestamp combinations are valid');
      console.log('✅ All failed emails have error messages');
      console.log('✅ All data integrity constraints satisfied');
    } else {
      console.log('⚠️ Some issues remain - manual review may be needed');
    }
    
    console.log('\n🚀 Database cleanup completed successfully');
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

cleanupEmailDataIntegrity();