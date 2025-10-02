const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Manually process the email queue to send queued emails
async function processEmailQueue() {
  try {
    console.log('📤 Processing Email Queue');
    console.log('========================');
    
    const emailService = require('./backend/services/emailService-integrated');
    
    // Process the email queue
    const result = await emailService.processEmailQueue();
    
    console.log('Queue Processing Result:', JSON.stringify(result, null, 2));
    
    // Check queue status after processing
    console.log('\n📋 Checking queue status after processing...');
    const db = require('./backend/db');
    const { promisify } = require('util');
    const queryAsync = promisify(db.query).bind(db);
    
    const queueStatus = await queryAsync(`
      SELECT status, COUNT(*) as count
      FROM email_queue 
      GROUP BY status
    `);
    
    console.log('Updated Queue Status:');
    queueStatus.forEach(item => {
      console.log(`- ${item.status}: ${item.count} emails`);
    });
    
  } catch (error) {
    console.error('❌ Error processing email queue:', error);
  } finally {
    process.exit(0);
  }
}

processEmailQueue();