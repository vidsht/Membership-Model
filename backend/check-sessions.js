const db = require('./db');

console.log('Checking current sessions...');

// Check if sessions table exists and has any data
db.query('SHOW TABLES LIKE "sessions"', (err, results) => {
  if (err) {
    console.error('Error checking sessions table:', err);
    process.exit(1);
  }
  
  if (results.length === 0) {
    console.log('❌ Sessions table does not exist');
    process.exit(1);
  }
  
  console.log('✅ Sessions table exists');
  
  // Check for active sessions
  db.query('SELECT COUNT(*) as count FROM sessions', (err2, results2) => {
    if (err2) {
      console.error('Error counting sessions:', err2);
      process.exit(1);
    }
    
    console.log(`Sessions in database: ${results2[0].count}`);
    
    // Get recent sessions
    db.query('SELECT session_id, expires, LEFT(data, 100) as data_preview FROM sessions ORDER BY expires DESC LIMIT 5', (err3, results3) => {
      if (err3) {
        console.error('Error getting session details:', err3);
        process.exit(1);
      }
      
      console.log('\nRecent sessions:');
      results3.forEach((session, index) => {
        const isExpired = new Date(session.expires) < new Date();
        console.log(`${index + 1}. ID: ${session.session_id}, Expires: ${session.expires}, Expired: ${isExpired}`);
        console.log(`   Data preview: ${session.data_preview}...`);
      });
      
      process.exit(0);
    });
  });
});
