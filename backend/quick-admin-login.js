const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
app.use(express.json());

// Session configuration matching server.js
const sessionStore = new MySQLStore({
  expiration: 1000 * 60 * 60 * 24 * 7, // 7 days
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, db);

app.use(session({
  secret: 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  store: sessionStore,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: 'lax'
  }
}));

// Enable CORS for frontend connection
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Quick admin login endpoint
app.post('/quick-admin-login', async (req, res) => {
  try {
    // Get the first admin user
    db.query('SELECT * FROM users WHERE userType = "admin" LIMIT 1', async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'No admin user found' });
      }
      
      const user = results[0];
      
      // Create session
      req.session.userId = user.id;
      req.session.userType = user.userType;
      
      console.log('Admin session created for user:', user.email);
      console.log('Session ID:', req.sessionID);
      
      res.json({
        success: true,
        message: 'Admin session created',
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType
        },
        sessionId: req.sessionID
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test server running',
    sessionId: req.sessionID,
    session: req.session
  });
});

const port = 5002;
app.listen(port, () => {
  console.log(`Quick admin login server running on port ${port}`);
  console.log('To create admin session: POST http://localhost:5002/quick-admin-login');
});
