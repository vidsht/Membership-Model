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
    'https://membership.indiansinghana.com',
    // 'http://localhost:3000',
    // 'http://localhost:3001',
    // 'http://localhost:3002',
    // 'http://localhost:3003',
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

// Import existing pool from db.js to share connections
const dbPool = require('./db');

// Create session store using the existing pool for better connection handling
const sessionStoreOptions = {
  clearExpired: true,
  checkExpirationInterval: 900000, // 15 minutes
  expiration: 86400000, // 1 day
  createDatabaseTable: true,
  // Use the pool's promise-based connections
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
};

const sessionStore = new MySQLStore(sessionStoreOptions, dbPool.promise ? dbPool.promise() : dbPool);

// Add error handling for session store
sessionStore.onReady = function() {
  console.log('✅ MySQL session store ready');
};

sessionStore.on('error', function(error) {
  console.error('❌ MySQL session store error:', error);
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  store: sessionStore,
  cookie: {
    // secure: false,
    secure: true,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    // sameSite: 'lax'
    sameSite: 'none'
  }
}));

// MySQL connection (handled in db.js)
require('./db');

// Import database connection for public routes
const db = require('./db');
const { promisify } = require('util');
const queryAsync = promisify(db.query).bind(db);

// Basic routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Mount merchant routes
app.use('/api/merchant', require('./routes/merchant'));

// Public deals route for users
app.use('/api/deals', require('./routes/deals'));
app.use('/api/plans', require('./routes/plans'));

// Admin routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin', require('./routes/roles'));

// Upload routes
app.use('/api/upload', require('./routes/upload'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Public businesses endpoint for home page
app.get('/api/businesses', async (req, res) => {
  try {
    const businesses = await queryAsync(`
      SELECT b.businessId, b.businessName, b.businessDescription, b.businessCategory,
             b.businessAddress, b.businessPhone, b.businessEmail, b.website,
             b.isVerified, u.fullName as ownerName, u.membershipType as membershipLevel
      FROM businesses b
      LEFT JOIN users u ON b.userId = u.id
      WHERE (b.status = 'active' OR b.status = '') AND u.status = 'approved'
      ORDER BY b.businessName ASC
    `);
    
    // Format the data for frontend consumption
    const formattedBusinesses = businesses.map(business => ({
      id: business.businessId,
      name: business.businessName,
      description: business.businessDescription,
      sector: business.businessCategory || 'General',  // Map to expected 'sector' field
      address: business.businessAddress,
      phone: business.businessPhone,
      email: business.businessEmail,
      website: business.website,
      isVerified: business.isVerified,
      membershipLevel: business.membershipLevel,
      ownerName: business.ownerName
    }));
    
    res.json(formattedBusinesses);
  } catch (err) {
    console.error('Error fetching public businesses:', err);
    res.status(500).json({ success: false, message: 'Server error fetching businesses' });
  }
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
