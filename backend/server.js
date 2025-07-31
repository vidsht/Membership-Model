const express = require('express');
// const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS configuration for credentials

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    // Add your deployed frontend URL here
  ],
  credentials: true,
};
app.use(cors(corsOptions));

// Basic middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration (MySQL store)
const MySQLStore = require('express-mysql-session')(session);
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
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


// MySQL connection (handled in db.js)
require('./db');

// Basic routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/merchant', require('./routes/merchant'));
app.use('/api/merchant/deals', require('./routes/deals'));
// Public deals route for users
app.use('/api/deals', require('./routes/deals'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin', require('./routes/deals'));
app.use('/api/admin', require('./routes/roles'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
});
