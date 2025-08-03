const db = require('./db');

// Simple function to create a fresh admin session for testing
console.log('Creating fresh admin session for testing...');

// Clear old expired sessions first
db.query('DELETE FROM sessions WHERE expires < NOW()', (err) => {
  if (err) {
    console.error('Error clearing old sessions:', err);
  } else {
    console.log('Old sessions cleared');
  }
  
  // For testing, we need to manually create a session entry
  // This simulates what happens when an admin logs in
  
  // Get an admin user
  db.query('SELECT id, email FROM users WHERE userType = "admin" LIMIT 1', (err, results) => {
    if (err) {
      console.error('Error getting admin user:', err);
      process.exit(1);
    }
    
    if (results.length === 0) {
      console.error('No admin user found in database');
      process.exit(1);
    }
    
    const adminUser = results[0];
    console.log('Found admin user:', adminUser.email);
    
    // Create a session manually (this is normally done by express-session)
    const sessionId = 'test-admin-session-' + Date.now();
    const sessionData = JSON.stringify({
      cookie: {
        originalMaxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        expires: new Date(Date.now() + (1000 * 60 * 60 * 24 * 7)).toISOString(),
        secure: false,
        httpOnly: true,
        sameSite: 'lax'
      },
      userId: adminUser.id,
      userType: 'admin'
    });
    
    const expires = Math.floor((Date.now() + (1000 * 60 * 60 * 24 * 7)) / 1000);
    
    db.query(
      'INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)',
      [sessionId, expires, sessionData],
      (err, result) => {
        if (err) {
          console.error('Error creating session:', err);
          process.exit(1);
        }
        
        console.log('✅ Admin session created successfully!');
        console.log('Session ID:', sessionId);
        console.log('Admin User ID:', adminUser.id);
        console.log('Expires:', new Date(expires * 1000));
        console.log('\nTo use this session, set the cookie:');
        console.log(`sessionId=${sessionId}`);
        console.log('\nOr restart the backend and login through the normal process.');
        
        process.exit(0);
      }
    );
  });
});
