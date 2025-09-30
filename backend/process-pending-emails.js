require('dotenv').config();
const mysql = require('mysql2');
const db = require('./db');
const emailService = require('./services/emailService');

const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

const processPendingEmails = async () => {
  try {
    console.log('🔄 Processing pending emails from email_notifications table...');
    console.log('==========================================');
    
    // Get pending emails from email_notifications table
    const pendingEmails = await queryAsync(`
      SELECT *
      FROM email_notifications 
      WHERE status = 'pending'
      ORDER BY created_at ASC 
      LIMIT 20
    `);
    
    console.log(`📧 Found ${pendingEmails.length} pending emails to process`);
    
    if (pendingEmails.length === 0) {
      console.log('✅ No pending emails to process');
      return;
    }
    
    let processed = 0;
    let failed = 0;
    
    for (const email of pendingEmails) {
      try {
        console.log(`\n📤 Processing email ID ${email.id}: ${email.subject} to ${email.recipient}`);
        
        // Parse the data field
        const emailData = JSON.parse(email.data || '{}');
        
        // Prepare the email options
        const emailOptions = {
          to: email.recipient,
          type: email.type,
          data: emailData,
          logId: email.id // Pass the existing log ID to update it
        };
        
        // Use the email service to send the email
        const result = await emailService.sendEmail(emailOptions);
        
        console.log(`✅ Email ID ${email.id} sent successfully: ${result.messageId}`);
        processed++;
        
        // Small delay to avoid overwhelming the SMTP server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to send email ID ${email.id}:`, error.message);
        failed++;
        
        // Update the email log with failure information
        try {
          await queryAsync(`
            UPDATE email_notifications 
            SET status = 'failed', error = ?, updated_at = NOW()
            WHERE id = ?
          `, [error.message, email.id]);
        } catch (updateError) {
          console.error(`❌ Failed to update email log for ID ${email.id}:`, updateError.message);
        }
      }
    }
    
    console.log('\n📊 Processing Summary:');
    console.log(`======================`);
    console.log(`✅ Successfully processed: ${processed} emails`);
    console.log(`❌ Failed to process: ${failed} emails`);
    console.log(`📧 Total processed: ${processed + failed} emails`);
    
    // Check remaining pending emails
    const remainingPending = await queryAsync(`
      SELECT COUNT(*) as count 
      FROM email_notifications 
      WHERE status = 'pending'
    `);
    
    console.log(`📋 Remaining pending emails: ${remainingPending[0].count}`);
    
  } catch (error) {
    console.error('❌ Error processing pending emails:', error);
  } finally {
    process.exit(0);
  }
};

processPendingEmails();